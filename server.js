#!/usr/bin/env node
const nconf = require('nconf');
const logger = require('./log.js');
const app = require('./src/app');
const env = nconf.get('env');

// Check ES (if in use)
if (env.ES_HOST && typeof env.ES_HOST === 'string') {
  const runES = require('./src/run-es');
  const checkES = new runES.Elastic();
  checkES.setup()
    .then(() => {
      startListen();
    });
} else {
  startListen();
  logger.debug(`No (valid) Elasticsearch host provided - results will NOT be saved!`);
}

function startListen() {
  app.set('port', env.HTTP_PORT || 80);
  app.listen(app.get('port'), () => {
    logger.debug(`TIMINGS API ["${env.NODE_ENV}"] is running on port [${app.get('port')}]`);
  });
}
