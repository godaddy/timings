#!/usr/bin/env node

const os = require('os');
const app = require('./src/app');
const logger = require('./log.js');
// const logger = require('winston');
const esUtils = require('./src/v2/es-utils');
const pkg = require('./package.json');
const yargs = require('yargs');
const config = require('./.config.js');
const timingsTemplate = require('./.es_template.js');

// Process arguments
const argv = yargs
  .help('h')
  .alias('h', 'help')
  .options({
    d: {
      alias: 'debug',
      boolean: true,
      describe: 'enable console debugging'
    },
    e: {
      alias: 'env',
      describe: 'specify runtime environment',
      choices: ['local', 'dev', 'test', 'prod'],
      default: config.NODE_ENV || 'local'
    },
    f: {
      alias: 'eshost',
      describe: 'specify the elasticsearch host'
    },
    g: {
      alias: 'esport',
      describe: 'specify the elasticsearch port'
    },
    esprotocol: {
      describe: 'The protocol of the elasticsearch server'
    },
    esuser: {
      describe: 'The user for elasticsearch server auth'
    },
    espasswd: {
      describe: 'The password for elasticsearch server auth'
    },
    es_ssl_cert: {
      describe: 'Path to the SSL cert for elasticsearch server auth'
    },
    es_ssl_key: {
      describe: 'Path to the SSL key for elasticsearch server auth'
    },
    k: {
      alias: 'kbhost',
      describe: 'specify the kibana host'
    },
    l: {
      alias: 'kbport',
      describe: 'specify the kibana port'
    },
    watch: {
      boolean: true,
      describe: 'watch local build',
      default: false
    },
    p: {
      alias: 'http',
      describe: 'HTTP Port'
    }
  })
  .strict()
  .argv;

/* eslint no-process-env: 0 */
if (!config.env) config.env = {};
config.env.APP_NAME = pkg.name;
config.env.APP_VERSION = pkg.version;
config.env.NODE_ENV = argv.env;
config.env.DEBUG = argv.debug || config.env.DEBUG || process.env.DEBUG || false;
config.env.HOST = os.hostname();
config.env.HTTP_PORT = argv.http || config.env.HTTP_PORT || process.env.HTTP_PORT || 80;
// config.env.HTTP_PORT = argv.http;

if (config.env.DEBUG !== true) {
  logger.transports.console.silent = true;
}

// Check ELK settings
if (config.env.ES_HOST || argv.eshost || process.env.ES_HOST || config.env.KB_HOST || argv.kbhost || process.env.KB_HOST) {
  // elasticsearch is configured
  config.params.useES = true;
  // Populate config.env if settings came from arguments or ENV variable
  // Config file is always leading!
  config.env.ES_HOST = argv.eshost || config.env.ES_HOST || process.env.ES_HOST ||
    argv.kbhost || config.env.KB_HOST || process.env.KB_HOST;
  config.env.ES_PORT = argv.esport || config.env.ES_PORT || process.env.ES_PORT || 9200;
  config.env.KB_HOST = argv.kbhost || config.env.KB_HOST || process.env.KB_HOST ||
    argv.eshost || config.env.ES_HOST || process.env.ES_HOST;
  config.env.ES_USER = argv.esuser || config.env.ES_USER || process.env.ES_USER || '';
  config.env.ES_PASS = argv.espasswd || config.env.ES_PASS || process.env.ES_PASS || '';
  config.env.ES_SSL_CERT = argv.es_ssl_cert || config.env.ES_SSL_CERT || process.env.ES_SSL_CERT || '';
  config.env.ES_SSL_KEY = argv.es_ssl_key || config.env.ES_SSL_KEY || process.env.ES_SSL_KEY || '';
  config.env.ES_PROTOCOL = argv.esprotocol || config.env.ES_PROTOCOL || process.env.ES_PROTOCOL || 'http';
  config.env.KB_PORT = argv.kbport || config.env.KB_PORT || process.env.KB_PORT || 5601;
  config.env.INDEX_PERF = 'cicd-perf';
  config.env.INDEX_RES = 'cicd-resource';
  config.env.INDEX_ERR = 'cicd-errorlog';
  // Setup ElasticSearch client & index
  setupES(new esUtils.ESClass());
} else {
  config.params.useES = false;
  startServer();
}

async function setupES(es) {
  try {
    await es.ping();
    const indexExists = await es.indexExists(config.env.INDEX_PERF);
    const templateCreated = await es.putTemplate(config.env.INDEX_PERF, timingsTemplate);
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
