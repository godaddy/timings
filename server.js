#!/usr/bin/env node
const nconf = require('nconf');
const logger = require('./log.js');
const app = require('./src/app');
const env = nconf.get('env');

// Check ES (if in use)
if (env.ES_HOST && typeof env.ES_HOST === 'string') {
  const runES = require('./src/run-es');
  const checkES = new runES.Elastic();
  checkES.setup();
} else {
  logger.debug(`[Elasticsearch] no host/port provided in config [${env.APP_CONFIG}] - results will NOT be saved!`);
}
startListen();

function startListen() {
  app.set('port', env.HTTP_PORT || 80);
  app.listen(app.get('port'), () => {
    logger.debug(`[timings API] - ${env.HOST}:${env.HTTP_PORT} - v${env.APP_VERSION} - running on port [${app.get('port')}]`);
  });
}
