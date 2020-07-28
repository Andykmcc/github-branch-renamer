const got = require('got');

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

class GithubClient {
  constructor(githubToken, repoUrl) {
    this._client = got.extend({
      prefixUrl: 'https://api.github.com',
      headers: {
        'accept': 'application/vnd.github.v3+json',
        'authorization': `token ${githubToken}`
      },
      responseType: 'json'
    });

    this.owner = getRepoOwner(repoUrl);
    this.repoName = getRepoName(repoUrl);
  }

  // {
  //   default_branch: defaultBranch
  // }
  async updateRepo(params) {
    const {body} = await this._client.patch(`repos/${this.owner}/${this.repoName}`, {
      json: params
    });
    return body;
  }

  // {
  //   state: 'open',
  //   base: undesiredDefault
  // }
  async getOpenPullRequests(query) {
    const {body} = await this._client.get(`repos/${this.owner}/${this.repoName}/pulls`, {
      searchParams: query
    });
    return body;
  }

  // {
  //   base: desiredDefault
  // }
  async updatePullRequests(params, prNumber) {
    const {body} = await this._client.patch(`repos/${this.owner}/${this.repoName}/pulls/${prNumber}`, {
      json: params
    });
  
    return body;
  }
}

module.exports = GithubClient;
