#!/usr/bin/env node
"use strict";

const inquirer = require("inquirer");
const changeRepoDefaultBranch = require('../lib');
const { isHttpsUri } = require('valid-url');
const {default: PQueue} = require('p-queue');

const queue = new PQueue({concurrency: 4});

async function main() {
  const {urlStrings, undesiredDefault, desiredDefault, githubToken} = await inquirer.prompt([
    {
      name: 'urlStrings',
      message: 'Comma seprated list of HTTPS git urls (e.g. https://github.com/mapbox/hey.git)?',
      validate: (urls) => {
        const allValid = urls.split(',').map(s => s.trim()).filter(s => !!s).some(uri => {
          return isHttpsUri(uri) === undefined ? false : true;
        });
        return allValid ? true : 'invalid HTTPS URL';
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

  try {
    const repoUrls = urlStrings.split(',').map(s => s.trim()).filter(s => !!s);

    const results = await Promise.allSettled(repoUrls.map(repoUrl => {
      return queue.add(() => changeRepoDefaultBranch(repoUrl, undesiredDefault, desiredDefault, githubToken));
    }));

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`Success: ${repoUrls[index]}.`);
      } else {
        console.error(`Failure: ${repoUrls[index]}. ${result.reason}`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

main();
