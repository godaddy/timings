#!/usr/bin/env node
const nconf = require('nconf');
const git = require('git-rev');
require('./src/config');
const logger = require('./log.js');
const app = require('./src/app');

// First, add the current git release to the config
git.tag(apiVer => {
  const semver = require('semver');
  apiVer = semver.valid(apiVer);
  if (!apiVer) {
    // This is probably an NPM install - get version from package.json
    const pkg = require('./package.json');
    apiVer = semver.valid(pkg.version);
  }
  nconf.set('env:APP_VERSION', apiVer || 'unknown');
  logger.debug(`timings API - CONFIG - Following settings are in use: \n${JSON.stringify(nconf.get(), null, 2)}`);
  logger.info(`timings API - CONFIG - Using config ["${nconf.get('env:APP_CONFIG') || '{unknown}'}"]`);
  logger.info(`timings API - STATUS - Server v${nconf.get('env:APP_VERSION') || '{unknown}'} is running at ` +
    `http://${nconf.get('env:HOST')}:${nconf.get('env:HTTP_PORT')}`);

  // Check ES (if in use)
  if (nconf.get('env:ES_HOST')) {
    const runES = require('./src/run-es');
    const checkES = new runES.Elastic();
    checkES.setup();
  } else {
    logger.warn(`timings API - CONFIG - No Elasticsearch HOST in config [${nconf.get('env:APP_CONFIG')}] - data will NOT be saved!`);
  }
  startListen();
});

function startListen() {
  app.set('port', nconf.get('env:HTTP_PORT') || 80);
  app.listen(app.get('port'));
}
