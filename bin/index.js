#!/usr/bin/env node
"use strict";

const inquirer = require("inquirer");
const { isHttpsUri } = require('valid-url');
const {default: PQueue} = require('p-queue');
const { updateRepo, updateGithub } = require('../lib');
const { setupGitEnv } = require('../lib/gitClient');

const queue = new PQueue({concurrency: 4});

async function main() {
  const {urls, undesiredDefault, desiredDefault, githubToken} = await inquirer.prompt([
    {
      name: 'urls',
      message: 'Comma seprated list of HTTPS git urls (e.g. https://github.com/Andykmcc/github-branch-renamer.git)?',
      validate: urls => {
        const allValid = urls.some(url => isHttpsUri(url) === undefined ? false : true);
        return allValid ? true : 'invalid HTTPS URL';
      },
      filter: urlStrings => {
        return [...new Set(urlStrings.split(',').map(s => s.trim()).filter(s => !!s))];
      }
    },
    {
      name: 'undesiredDefault',
      message: 'What is the name of the branch you would like to remove?',
      default: 'master'
    },
    {
      name: 'desiredDefault',
      message: 'What would you like to be the name of your new default branch?',
      default: 'main'
    },
    {
      name: 'githubToken',
      message: 'Gitub Personal access token (process.env.GITHUB_TOKEN).',
      type: 'password',
      default: () => process.env.GITHUB_TOKEN
    },
  ]);

  const tearDownGitEnvFn = await setupGitEnv();

  try {
    const results = await Promise.allSettled(urls.map(repoUrl => {
      return queue.add(async () => {
        await updateRepo(repoUrl, undesiredDefault, desiredDefault);
        await updateGithub(repoUrl, undesiredDefault, desiredDefault, githubToken);
      });
    }));

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`Success: ${urls[index]}.`);
      } else {
        console.error(`Failure: ${urls[index]}. ${result.reason}`);
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await tearDownGitEnvFn();
  }
}

main();
