"use strict";
const execa = require('execa');
const { join } = require('path');
const { promisify } = require('util');
const { tmpdir } = require('os');
const { mkdtemp } = require('fs');
const got = require('got');

async function createTempDir() {
  return promisify(mkdtemp)(
    join(tmpdir(), "repo-rename-")
  );
}

function getRepoPathParts(repoUrlString) {
  const repoUrl = new URL(repoUrlString);
  return repoUrl.pathname.replace(/\.git$/, '').split('/').filter(s => !!s);
}

function getRepoOwner(repoUrl) {
  return getRepoPathParts(repoUrl)[0];
}

function getRepoName(repoUrl) {
  return getRepoPathParts(repoUrl)[1];
}

async function updateRepo(githubToken, defaultBranch, repoUrl) {
  const owner = getRepoOwner(repoUrl);
  const repoName = getRepoName(repoUrl);
  const {body} = await got.patch(`https://api.github.com/repos/${owner}/${repoName}`, {
		json: {
			default_branch: defaultBranch
		},
		headers: {
			'accept': 'application/vnd.github.v3+json',
			'authorization': `token ${githubToken}`
    },
    responseType: 'json'
  });
  return body;
}

async function getOpenPullRequests(repoUrlString, undesiredDefault, githubToken) {
  const owner = getRepoOwner(repoUrlString);
  const name = getRepoName(repoUrlString);
  const {body} = await got.get(`https://api.github.com/repos/${owner}/${name}/pulls`, {
		headers: {
			'accept': 'application/vnd.github.v3+json',
			'authorization': `token ${githubToken}`
    },
    responseType: 'json',
    searchParams: {
      state: 'open',
      base: undesiredDefault
    }
  });
  return body;
}

async function updateOpenPullRequests(desiredDefault, prUrl, githubToken) {
  const {body} = await got.patch(prUrl, {
    json: {
      base: desiredDefault
    },
		headers: {
			'accept': 'application/vnd.github.v3+json',
			'authorization': `token ${githubToken}`
    },
    responseType: 'json',
  });

  return body;
}

async function changeRepoDefaultBranch(repoUrl, undesiredDefault, desiredDefault, githubToken) {
  const tempDir = await createTempDir();
  const options = {
    cwd: tempDir
  }
  await execa('git', ['clone', repoUrl, tempDir], options);

  const {stdout: symbolicRef} = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], options);
  
  if (!symbolicRef.includes(`/${undesiredDefault}`)) {
    const ref = symbolicRef.split('/');
    if (!symbolicRef.includes(`/${desiredDefault}`)) {
      throw new Error(`Remote HEAD points to ${ref[ref.length-1]}, not ${undesiredDefault} or ${desiredDefault} in ${repoUrl}. Skipping...`);
    }
  }

  const {stdout: remoteBranches} = await execa('git', ['branch', '-a'], options);
  
  if (remoteBranches.split('\n').map(s => s.trim()).some(s => s.includes(`remotes/origin/${desiredDefault}`))) {
    console.warn(`Remote already container a branch named ${desiredDefault} in ${repoUrl}`);
  } 

  try {
    await execa('git', ['branch', '-m', undesiredDefault, desiredDefault], options);
  } catch (err) {
    // branch with name already exists
    if (err.exitCode !== 128) {
      throw err;
    }
  }
  
  await execa('git', ['push', '-u', 'origin', desiredDefault], options);
  await updateRepo(githubToken, desiredDefault, repoUrl);

  const openPRs = await getOpenPullRequests(repoUrl, undesiredDefault, githubToken);
  const prUpdates = await Promise.allSettled(openPRs.map(pr => updateOpenPullRequests(desiredDefault, pr.url, githubToken)));
 
  if (prUpdates.some(pr => pr.status === "rejected")) {
    const errMessages = prUpdates.map(prUpdate => {
      if (prUpdate.status === "rejected") {
        return prUpdate.reason;
      }
    }).filter(s => s).join('. ');
    throw new Error(`Error(s) updating open PRs. ${errMessages}`);
  }
}

async function wrapper (repoUrl, undesiredDefault, desiredDefault, githubToken) {
  const credHelper = await execa('git', ['config', '--global', 'credential.helper']);
  await execa('git', ['config', '--global', 'credential.helper', 'cache']);
  try {
    await changeRepoDefaultBranch(repoUrl, undesiredDefault, desiredDefault, githubToken);
  } finally {
    await execa('git', ['config', '--global', 'credential.helper', credHelper]);
  }
}

module.exports = wrapper;
