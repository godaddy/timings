import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import winston from 'winston';
import logger from '../log.js';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const pkg = fs.readJsonSync(new URL('../../package.json', import.meta.url));
const { CONFIGFILE, ES_UPGRADE } = process.env;

// Load config file - only JSON!
let configFile = CONFIGFILE;

if (!configFile || !configFile.endsWith('.json') || !fs.existsSync(path.resolve(configFile))) {
  // Bad config file provided - Load defaults [./config/default.js]
  configFile = path.resolve(__dirname, '../../config', 'default.json');
}

function setConfig(app, appRootPath) {
  app.locals.configFile = app.locals.configFile || configFile;

  const appConfig = fs.readJsonSync(configFile);

  // Check for missing keys & add some ENV vars
  if (!appConfig.env) {
    appConfig.env = {};
  }
  if (!appConfig.params) {
    appConfig.params = {};
  }
  if (!appConfig.params.defaults) {
    appConfig.params.defaults = {};
  }
  if (!appConfig.params.defaults.baseline) {
    appConfig.params.defaults.baseline = {};
  }
  if (!appConfig.params.defaults.flags) {
    appConfig.params.defaults.flags = {};
  }

  // Combine ENV variables with config - ENV is leading!
  app.locals.esUpgrade = ES_UPGRADE;
  app.locals.appRootPath = appRootPath;
  app.locals.env = {
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_PATH: process.env.LOG_PATH,
    ES_PROTOCOL: process.env.ES_PROTOCOL || appConfig.env.ES_PROTOCOL || 'http',
    ES_HOST: process.env.ES_HOST || appConfig.env.ES_HOST || process.env.KB_HOST || appConfig.env.KB_HOST || '',
    ES_PORT: process.env.ES_PORT || appConfig.env.ES_PORT || 9200,
    ES_TIMEOUT: process.env.ES_TIMEOUT || appConfig.env.ES_TIMEOUT || 5000,
    ES_USER: process.env.ES_USER || appConfig.env.ES_USER || '',
    ES_PASS: process.env.ES_PASS || appConfig.env.ES_PASS || '',
    ES_SSL_CERT: process.env.ES_SSL_CERT || appConfig.env.ES_SSL_CERT || '',
    ES_SSL_KEY: process.env.ES_SSL_KEY || appConfig.env.ES_SSL_KEY || '',
    KB_HOST: process.env.KB_HOST || appConfig.env.KB_HOST || process.env.ES_HOST || appConfig.env.ES_HOST || '',
    KB_PORT: process.env.KB_PORT || appConfig.env.KB_PORT || 5601,
    KB_INDEX: process.env.KB_INDEX || appConfig.env.KB_INDEX || '.kibana',
    KB_RENAME: process.env.KB_RENAME || appConfig.env.KB_RENAME || '',
    HTTP_PORT: process.env.HTTP_PORT || appConfig.env.HTTP_PORT || 80,
    HOST: process.env.API_HOST || appConfig.env.HOST || os.hostname(),
    APP_NAME: pkg.name,
    APP_CONFIG: app.locals.configFile,
    NODE_ENV: process.env.NODE_ENV || 'development',
    INDEX_PERF: 'cicd-perf',
    INDEX_RES: 'cicd-resource',
    INDEX_ERR: 'cicd-errorlog',
    ES_ACTIVE: process.env.ES_ACTIVE === true
  };
  app.locals.env.APP_URL = `${app.locals.env.HTTP_PORT === 80 ? 'http' : 'https'}://` +
    `${app.locals.env.HOST}:${app.locals.env.HTTP_PORT}`;
  app.locals.env.ES_URL = `${app.locals.env.ES_PROTOCOL}://${app.locals.env.ES_HOST}:${app.locals.env.ES_PORT}`;
  app.locals.env.KB_URL = `${app.locals.env.ES_PROTOCOL}://${app.locals.env.KB_HOST}:${app.locals.env.KB_PORT}`;

  app.locals.params = {
    required: appConfig.params.required || ['log.test_info', 'log.env_tester', 'log.team', 'log.browser', 'log.env_target'],
    defaults: {
      baseline: {
        days: appConfig.params.defaults.baseline.days || 7,
        perc: appConfig.params.defaults.baseline.perc || 75,
        padding: appConfig.params.defaults.baseline.padding || 1.2
      },
      flags: {
        assertBaseline: appConfig.params.defaults.flags.assertBaseline === true,
        debug: appConfig.params.defaults.flags.debug === true,
        esTrace: appConfig.params.defaults.flags.esTrace === true,
        esCreate: appConfig.params.defaults.flags.esCreate === true,
        passOnFailedAssert: appConfig.params.defaults.flags.passOnFailedAssert === true
      }
    }
  };
  // Attempt to create logging path - custom path is leading (LOG_PATH variable)
  // - the first path that is successfully creates wins
  app.locals.env.LOG_PATH = createPath([
    app.locals.env.LOG_PATH,
    path.join('..', 'timings', 'logs'),
    `${os.homedir()}/timings/logs`,
    '/var/log/timings/logs',
    '/tmp/timings/logs',
    '/temp/timings/logs'
  ]);

  // Add loggers to the app
  logger.addLoggers(app);
  app.logger = winston.loggers.get('app');
}

function getConfig(appObject, appRootPath) {
  setConfig(appObject, appRootPath);
  return setConfig;
}

function createPath(paths) {
  let res = false;
  paths.forEach(trypath => {
    if (trypath) {
      trypath = path.resolve(trypath);
      if (!res && fs.existsSync(path.resolve(trypath, 'app.log'))) { res = trypath; }
      if (res) { return; }
      try {
        fs.ensureDirSync(trypath);
        fs.accessSync(trypath, fs.W_OK);
        res = trypath;
        return;
      } catch (err) {
        console.log('error', `timings API - LOGGING - unable to create logging path ["${trypath}"]`, err);
        return;
      }
    }
  });
  return res;
}

export { setConfig, getConfig };
