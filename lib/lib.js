"use strict";

const { join } = require('path');
const { promisify } = require('util');
const { tmpdir } = require('os');
const { mkdtemp } = require('fs');

async function createTempDir() {
  return promisify(mkdtemp)(
    join(tmpdir(), "repo-rename-")
  );
}

module.exports = {
  createTempDir,
};
