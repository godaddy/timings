const os = require('os');
const pkg = require('../package.json');
const path = require('path');
const fs = require('fs');
const nconf = require('nconf');

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
    whitelist: ['configfile', 'node_env', 'http_port', 'debug', 'es_host', 'es_port',
      'es_protocol', 'es_user', 'es_passwd', 'es_ssl_cert', 'es_ssl_key', 'kb_host', 'kb_port'
    ],
    parseValues: true
  });

// Build config object
let cfgConfig = {};

// Check if there is a user provided config file
let cfgFile = path.resolve(nconf.get('configfile') || nconf.get('configFile') || './.config.js');
if (cfgFile && fs.existsSync(cfgFile)) {
  if (cfgFile.substr((cfgFile.lastIndexOf('.') + 1)) === 'js') {
    // supplied file is JS - have to require
    cfgConfig = require(cfgFile);
  } else if (cfgFile.substr((cfgFile.lastIndexOf('.') + 1)) === 'json') {
    // supplied file is JSON - have to read & parse
    cfgConfig = JSON.parse(fs.readFileSync(cfgFile));
  }
} else {
  cfgFile = 'No file provided - using ENV variables + defaults values';
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
      baseline: {           // These settings are used to calculate the baseline
        days: cfgConfig.params.defaults.baseline.days || 7,                              // Number of days to calculate the baseline for
        perc: cfgConfig.params.defaults.baseline.perc || 75,                             // Percentile to calculate
        padding: cfgConfig.params.defaults.baseline.padding || 1.2                       // Extra padding on top of the calculated baseline (gives some wiggle-room)
      },
      flags: {              // These booleans determine the output and other actions to be performed
        assertBaseline: cfgConfig.params.defaults.flags.assertBaseline || true,          // Whether or not to compare against baseline
        debug: cfgConfig.params.defaults.flags.debug || false,                           // Request extra debug info from the API
        esTrace: cfgConfig.params.defaults.flags.esTrace || false,                       // Request elasticsearch output from API
        esCreate: cfgConfig.params.defaults.flags.esCreate || false,                     // Save results to elasticsearch
        passOnFailedAssert: cfgConfig.params.defaults.flags.passOnFailedAssert || false  // Pass the test, even when the performance is above the threshold
      }
    }
  }
};

// if (cfgNconf.env.ES_HOST && typeof cfgNconf.env.ES_HOST === 'string') {
//   cfgNconf.env.useES = true;
// }

// Load config object into nconf
nconf
  .use('memory')
  .defaults(cfgNconf);
