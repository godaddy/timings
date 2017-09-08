#!/usr/bin/env node

const os = require('os');
const app = require('./src/app');
const logger = require('./log.js');
// const logger = require('winston');
const esUtils = require('./src/v2/es-utils');
const pkg = require('./package.json');
const yargs = require('yargs');
const config = require('./.config.js');
const cicdTemplate = require('./.template.js');

// Process arguments
const argv = yargs
  .help('h')
  .alias('h', 'help')
  .options({
    d: {
      alias: 'debug',
      boolean: true,
      describe: 'enable console debugging',
      default: false
    },
    e: {
      alias: 'env',
      describe: 'specify runtime environment',
      choices: ['local', 'dev', 'test', 'prod'],
      default: config.NODE_ENV || 'local'
    },
    f: {
      alias: 'eshost',
      describe: 'specify the elasticsearch host',
      default: ''
    },
    g: {
      alias: 'esport',
      describe: 'specify the elasticsearch port',
      default: 9200
    },
    k: {
      alias: 'kbhost',
      describe: 'specify the kibana host',
      default: ''
    },
    l: {
      alias: 'kbport',
      describe: 'specify the kibana port',
      default: 5601
    },
    watch: {
      boolean: true,
      describe: 'watch local build',
      default: false
    },
    p: {
      alias: 'http',
      describe: 'HTTP Port',
      default: 80
    }
  })
  .strict()
  .argv;

/* eslint no-process-env: 0 */
config.env = {
  APP_NAME: pkg.name,
  APP_VERSION: pkg.version,
  NODE_ENV: argv.env,
  DEBUG: argv.debug,
  ES_HOST: argv.eshost || process.env.ES_HOST,
  ES_PORT: argv.esport || process.env.ES_PORT,
  KB_HOST: argv.kbhost || process.env.KB_HOST || argv.eshost || process.env.ES_HOST,
  KB_PORT: argv.kbport || process.env.KB_PORT,
  INDEX_PERF: 'cicd-perf',
  INDEX_RES: 'cicd-perf-res',
  INDEX_ERR: 'cicd-perf-errorlog',
  HOST: os.hostname(),
  HTTP_PORT: argv.http
};

if (config.env.DEBUG !== true) {
  logger.transports.console.silent = true;
}

// Check if we're using ElasticSearch
if (!config.env.ES_HOST) {
  config.params.useES = false;
  startServer();
} else {
  config.params.useES = true;
  // Setup ElasticSearch client & index
  setupES(new esUtils.ESClass());
}

async function setupES(es) {
  try {
    await es.ping();
    const indexExists = await es.indexExists(config.env.INDEX_PERF);
    const templateCreated = await es.putTemplate('cicd-perf', cicdTemplate);
    let indexCreated = false;
    if (indexExists !== true) {
      indexCreated = await es.indexCreate(config.env.INDEX_PERF);
    }
    config.params.useES = ((indexExists === true || indexCreated === true) && templateCreated === true);
  } catch (err) {
    logger.debug(err.message);
    config.params.useES = false;
  }
  startServer();
}

// Let's go!
function startServer() {
  app.set('port', config.env.HTTP_PORT || 80);
  const server = app.listen(app.get('port'), () => {
    logger.debug('TIMINGS API [' + config.env.NODE_ENV + '] is running on port ' + server.address().port);
  });
}
