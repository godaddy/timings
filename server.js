#!/usr/bin/env node
const nconf = require('nconf');
const logger = require('./log.js');
const app = require('./src/app');
const env = nconf.get('env');

// Check ES (if in use)
if (env.ES_HOST) {
  const runES = require('./src/run-es');
  const checkES = new runES.Elastic();
  checkES.setup();
} else {
  logger.info(`[timings API] no Elasticsearch info provided in config [${env.APP_CONFIG}] - data will NOT be saved!`);
}
startListen();

function startListen() {
  app.set('port', env.HTTP_PORT || 80);
  app.listen(app.get('port'));
}
