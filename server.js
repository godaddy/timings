#!/usr/bin/env node
const logger = require('./log.js');
const esUtils = require('./src/v2/es-utils');
const timingsTemplate = require('./.es_template.js');
const nconf = require('nconf');
require('./src/api-config');

if (nconf.get('env:DEBUG') !== true) {
  logger.transports.console.silent = true;
}

if (nconf.get('env:ES_HOST') && typeof nconf.get('env:ES_HOST') === 'string') {
  setupES(new esUtils.ESClass());
}

function startServer() {
  const app = require('./src/app');
  app.set('port', nconf.get('env:HTTP_PORT') || 80);
  const server = app.listen(app.get('port'), () => {
    logger.debug('TIMINGS API ["' + nconf.get('env:NODE_ENV') + '"] is running on port [' + server.address().port + ']');
    logger.debug(' >> using config [' + nconf.get('env:APP_CONFIG') + ']');
  });
}

async function setupES(es) {
  try {
    await es.ping();
    const templExists = await es.templExists(nconf.get('env:INDEX_PERF'));
    let templateCreated = false;
    if (templExists !== true) {
      templateCreated = await es.putTemplate(nconf.get('env:INDEX_PERF'), timingsTemplate);
    }
    nconf.set('env:useES', (templExists === true || templateCreated === true));
  } catch (err) {
    logger.debug(err.message);
    nconf.set('env:useES', false);
  }
  startServer();
}
