const execa = require('execa');

async function setupGitEnv() {
  const credHelper = await execa('git', ['config', '--global', 'credential.helper']);
  await execa('git', ['config', '--global', 'credential.helper', 'cache']);

  return async () => {
    return tearDownGitEnv(credHelper);
  }
}

async function tearDownGitEnv(credHelper) {
  return execa('git', ['config', '--global', 'credential.helper', credHelper]);
}

class GitClient {
  constructor(options) {
    this.execaOptions = options;
  }

  async clone(dest, repoUrl) {
    const {stdout} = await execa('git', ['clone', repoUrl, dest], this.execaOptions);
    return stdout;
  }

  async getRepoHead() {
    const {stdout} = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], this.execaOptions);
    return stdout;
  }

  async getRemoteBranches() {
    const {stdout} = await execa('git', ['branch', '-a'], this.execaOptions);
    return stdout;
  }

  async renameBranch(undesiredDefault, desiredDefault) {
    const {stdout} = await execa('git', ['branch', '-m', undesiredDefault, desiredDefault], this.execaOptions);
    return stdout;
  }

  async pushBranch(branchName) {
    const {stdout} = await execa('git', ['push', '-u', 'origin', branchName], this.execaOptions);
    return stdout;
  }
}


module.exports = {
  GitClient,
  setupGitEnv,
  tearDownGitEnv
};
