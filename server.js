#!/usr/bin/env node
const os = require('os');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const nconf = require('nconf');

const logger = require('./log.js');
const pkg = require('./package.json');
const esUtils = require('./src/v2/es-utils');

/* eslint no-sync: 0 */
// Add arguments and environment variables to nconf
nconf
  .argv({
    c: {
      alias: 'config-file',
      describe: 'path to config file'
    }
  })
  .env({
    lowerCase: true,
    whitelist: ['configfile', 'node_env', 'http_port', 'debug', 'kb_index', 'kb_rename', 'es_upgrade', 'es_host',
      'es_port', 'es_protocol', 'es_user', 'es_passwd', 'es_ssl_cert', 'es_ssl_key', 'kb_host', 'kb_port'
    ],
    parseValues: true
  });

// Build config object
let cfgConfig = {};

// Check if there is a user provided config file
let cfgFile = path.resolve(nconf.get('configfile') || nconf.get('configFile') || './.config.js');
let cfgReason;
const cfgFileExt = cfgFile.substr((cfgFile.lastIndexOf('.') + 1));
if (cfgFile && fs.existsSync(cfgFile)) {
  switch (cfgFileExt) {
    case 'js':
      cfgConfig = require(cfgFile);
      break;
    case 'json':
      try {
        cfgConfig = JSON.parse(fs.readFileSync(cfgFile, { encoding: 'utf-8' }));
      } catch (err) {
        cfgReason = err.message;
      }
      break;
    case 'yaml':
    case 'yml':
      try {
        cfgConfig = yaml.safeLoad(fs.readFileSync(cfgFile, { encoding: 'utf-8' }));
      } catch (err) {
        cfgReason = `${err.name} - ${err.reason}`;
        cfgFile = `defaults`;
      }
      break;
    default:
      cfgReason = `Unknown file type [${cfgFileExt.toUpperCase()}]`;
      cfgFile = `defaults`;
  }
} else {
  cfgReason = `Could not find or access config file, or no file provided`;
  cfgFile = 'defaults';
}

// Check for missing keys
if (!cfgConfig.hasOwnProperty('env')) {
  cfgConfig.env = {};
}
if (!cfgConfig.hasOwnProperty('params')) {
  cfgConfig.params = {};
}
if (!cfgConfig.params.hasOwnProperty('defaults')) {
  cfgConfig.params.defaults = {};
}
if (!cfgConfig.params.defaults.hasOwnProperty('baseline')) {
  cfgConfig.params.defaults.baseline = {};
}
if (!cfgConfig.params.defaults.hasOwnProperty('flags')) {
  cfgConfig.params.defaults.flags = {};
}

// Combine all variables into one object - ENV is leading!
const cfgNconf = {
  env: {
    ES_PROTOCOL: nconf.get('es_protocol') || cfgConfig.env.ES_PROTOCOL || 'http',
    ES_HOST: nconf.get('es_host') || cfgConfig.env.ES_HOST || nconf.get('kb_host') ||  cfgConfig.env.KB_HOST || '',
    ES_PORT: nconf.get('es_port') || cfgConfig.env.ES_PORT || 9200,
    ES_USER: nconf.get('es_user') || cfgConfig.env.ES_USER || '',
    ES_PASS: nconf.get('es_pass') || cfgConfig.env.ES_PASS || '',
    ES_SSL_CERT: nconf.get('es_ssl_cert') || cfgConfig.env.ES_SSL_CERT || '',
    ES_SSL_KEY: nconf.get('es_ssl_key') || cfgConfig.env.ES_SSL_KEY || '',
    KB_HOST: nconf.get('kb_host') || cfgConfig.env.KB_HOST || nconf.get('es_host') ||  cfgConfig.env.ES_HOST || '',
    KB_PORT: nconf.get('kb_port') || cfgConfig.env.KB_PORT || 5601,
    KB_INDEX: nconf.get('kb_index') || cfgConfig.env.KB_INDEX || '.kibana',
    KB_RENAME: nconf.get('kb_rename') || cfgConfig.env.KB_RENAME || '',
    HTTP_PORT: nconf.get('http_port') || cfgConfig.env.HTTP_PORT || 80,
    DEBUG: nconf.get('debug') || cfgConfig.env.DEBUG || false,
    APP_NAME: pkg.name,
    APP_VERSION: pkg.version,
    APP_CONFIG: cfgFile,
    HOST: os.hostname(),
    NODE_ENV: nconf.get('node_env') || 'development',
    INDEX_PERF: 'cicd-perf',
    INDEX_RES: 'cicd-resource',
    INDEX_ERR: 'cicd-errorlog',
    useES: false
  },
  params: {
    required: cfgConfig.params.required || ['log.test_info', 'log.env_tester', 'log.team', 'log.browser', 'log.env_target'],
    defaults: {
      baseline: {
        days: cfgConfig.params.defaults.baseline.days || 7,
        perc: cfgConfig.params.defaults.baseline.perc || 75,
        padding: cfgConfig.params.defaults.baseline.padding || 1.2
      },
      flags: {
        assertBaseline: cfgConfig.params.defaults.flags.assertBaseline || true,
        debug: cfgConfig.params.defaults.flags.debug || false,
        esTrace: cfgConfig.params.defaults.flags.esTrace || false,
        esCreate: cfgConfig.params.defaults.flags.esCreate || false,
        passOnFailedAssert: cfgConfig.params.defaults.flags.passOnFailedAssert || false
      }
    }
  }
};

// Load config object into nconf
nconf
  .use('memory')
  .defaults(cfgNconf);

const env = nconf.get('env');

if (env.DEBUG !== true) {
  logger.transports.console.silent = true;
}


startServer();

async function startServer() {
  // Check ES (if in use)
  if (env.ES_HOST && typeof env.ES_HOST === 'string') {
    await setupES(new esUtils.ESClass());
  } else {
    logger.debug(`No (valid) Elasticsearch host provided - results will NOT be saved!`);
  }
  const app = require('./src/app');
  app.set('port', env.HTTP_PORT || 80);
  app.listen(app.get('port'), () => {
    logger.debug(`TIMINGS API ["${env.NODE_ENV}"] is running on port [${app.get('port')}]`);
    const cfgMsg = cfgReason ? ` - reason: ${cfgReason}` : '';
    logger.debug(` >> using config: [${env.APP_CONFIG}] ${cfgMsg}`);
  });
}

async function setupES(es) {
  try {
    logger.debug(`Checking ElasticSearch host ["${env.ES_HOST}"] ...`);
    await es.ping();
    logger.debug(` >> SUCCESS! found it on port [${env.ES_PORT}]!`);
    nconf.set('env:useES', true);

    logger.debug(`Checking if upgrades to ES are needed ...`);

    const newVer = parseInt(env.APP_VERSION.replace(/\./g, ''), 10);
    await checkUpgrade(es, newVer);

  } catch (err) {
    logger.debug(`Could not reach Elasticsearch Host [${env.ES_HOST}:${env.ES_PORT}] - error message: ${err.message}`);
    nconf.set('env:useES', false);
  }
  return true;
}

async function checkUpgrade(es, newVer) {
  let currVer;
  const currTemplate = await es.getTemplate(env.INDEX_PERF);

  if (currTemplate.hasOwnProperty(env.INDEX_PERF)) {
    currVer = currTemplate[env.INDEX_PERF].version;
  }

  if (!currVer || newVer > currVer || nconf.get('es_upgrade') === true) {

    doUpgrade(es, currVer, newVer);

  } else {
    logger.debug(` >> no upgrades needed ... current version: v.${currVer}`);
  }
}

async function doUpgrade(es, currVer, newVer) {
  // Import/update latest visualizations and dashboards
  logger.debug(` >> Upgrading Elasticsearch to v.${newVer} ... ` +
    `[Force: ${nconf.get('es_upgrade')} - New: ${!currVer} - Upgr: ${currVer < newVer}]`);

  let importFile = fs.readFileSync('./.kibana_items.json', 'utf8');
  const replText = nconf.get('env:KB_RENAME');
  if (replText && typeof replText === 'string') {
    importFile = importFile.replace(/TIMINGS/g, replText.toUpperCase());
  }
  const importJson = JSON.parse(importFile);
  const esResponse = await es.kbImport(importJson);
  if (esResponse === true) {
    await es.defaultIndex(env.INDEX_PERF + '*', '5.6.2');
  }

  // Make sure the latest template is present
  const templateJson = require('./.es_template.js');
  templateJson.version = newVer;
  await es.putTemplate('cicd-perf', templateJson);
  return true;
}
