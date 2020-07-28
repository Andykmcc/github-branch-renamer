"use strict";
const lib = require('./lib');
const { GitClient } = require('./gitClient');
const GithubClient = require('./githubClient');

async function updateRepo(repoUrl, undesiredDefault, desiredDefault) {
  const tempDir = await lib.createTempDir();
  const gitClient = new GitClient({ cwd: tempDir });
  
  await gitClient.clone(tempDir, repoUrl);
  const symbolicRef = await gitClient.getRepoHead();
  
  if (!symbolicRef.includes(`/${undesiredDefault}`)) {
    const ref = symbolicRef.split('/');
    if (!symbolicRef.includes(`/${desiredDefault}`)) {
      throw new Error(`Remote HEAD points to ${ref[ref.length-1]}, not ${undesiredDefault} or ${desiredDefault} in ${repoUrl}. Skipping...`);
    }
  }

  const remoteBranches = await gitClient.getRemoteBranches();
  
  if (remoteBranches.split('\n').map(s => s.trim()).some(s => s.includes(`remotes/origin/${desiredDefault}`))) {
    console.warn(`Remote already container a branch named ${desiredDefault} in ${repoUrl}`);
  } 

  try {
    await gitClient.renameBranch(undesiredDefault, desiredDefault);
  } catch (err) {
    // branch with name already exists
    if (err.exitCode !== 128) {
      throw err;
    }
  }
  
  await gitClient.pushBranch(desiredDefault);
}

async function updateGithub(repoUrl, undesiredDefault, desiredDefault, githubToken) {
  const githubClient = new GithubClient(githubToken, repoUrl);

  await githubClient.updateRepo({
    default_branch: desiredDefault
  });

  const openPRs = await githubClient.getOpenPullRequests({
    state: 'open',
    base: undesiredDefault
  });
  const prUpdates = await Promise.allSettled(openPRs.map(pr => {
    return githubClient.updatePullRequests({
      base: desiredDefault
    }, pr.number);
  }));
 
  if (prUpdates.some(pr => pr.status === "rejected")) {
    const errMessages = prUpdates.map(prUpdate => {
      if (prUpdate.status === "rejected") {
        return prUpdate.reason;
      }
    }).filter(s => s).join('. ');
    throw new Error(`Error(s) updating open PRs. ${errMessages}`);
  }
}

module.exports = {
  updateRepo,
  updateGithub
};
