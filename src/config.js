const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const nconf = require('nconf');
const pkg = require('../package.json');

/* eslint no-sync: 0 */
// Add arguments and environment variables to nconf
nconf
  .argv({
    c: {
      alias: 'configfile',
      describe: 'path to config file'
    }
  })
  .env({
    lowerCase: true,
    whitelist: ['configfile', 'node_env', 'api_host', 'host', 'http_port', 'log_level', 'log_path', 'kb_index', 'kb_rename',
      'es_upgrade', 'es_host', 'es_port', 'es_protocol', 'es_timeout', 'es_user', 'es_passwd', 'es_ssl_cert', 'es_ssl_key', 'kb_host', 'kb_port'
    ],
    parseValues: true
  });

// Load defaults first - use './.config.js for docker-compose
let cfgFile = path.resolve(__dirname, '../.config.js');
let cfgConfig = require(cfgFile);

if (nconf.get('configfile') && fs.existsSync(path.resolve(nconf.get('configfile')))) {
  // User supplied config file - overwrite config!
  cfgFile = path.resolve(nconf.get('configfile'));
  const cfgFileExt = cfgFile.substr((cfgFile.lastIndexOf('.') + 1));
  if (cfgFileExt === 'js') {
    cfgConfig = require(cfgFile);
  } else {
    cfgConfig = yaml.safeLoad(fs.readFileSync(cfgFile, { encoding: 'utf-8' }));
  }
}

// Check for missing keys
if (!cfgConfig.env) {
  cfgConfig.env = {};
}
if (!cfgConfig.params) {
  cfgConfig.params = {};
}
if (!cfgConfig.params.defaults) {
  cfgConfig.params.defaults = {};
}
if (!cfgConfig.params.defaults.baseline) {
  cfgConfig.params.defaults.baseline = {};
}
if (!cfgConfig.params.defaults.flags) {
  cfgConfig.params.defaults.flags = {};
}

// Combine ENV variables with config - ENV is leading!
const cfgNconf = {
  env: {
    ES_PROTOCOL: nconf.get('es_protocol') || cfgConfig.env.ES_PROTOCOL || 'http',
    ES_HOST: nconf.get('es_host') || cfgConfig.env.ES_HOST || nconf.get('kb_host') ||  cfgConfig.env.KB_HOST || '',
    ES_PORT: nconf.get('es_port') || cfgConfig.env.ES_PORT || 9200,
    ES_TIMEOUT: nconf.get('es_timeout') || cfgConfig.env.ES_TIMEOUT || 5000,
    ES_USER: nconf.get('es_user') || cfgConfig.env.ES_USER || '',
    ES_PASS: nconf.get('es_pass') || cfgConfig.env.ES_PASS || '',
    ES_SSL_CERT: nconf.get('es_ssl_cert') || cfgConfig.env.ES_SSL_CERT || '',
    ES_SSL_KEY: nconf.get('es_ssl_key') || cfgConfig.env.ES_SSL_KEY || '',
    KB_HOST: nconf.get('kb_host') || cfgConfig.env.KB_HOST || nconf.get('es_host') || cfgConfig.env.ES_HOST || '',
    KB_PORT: nconf.get('kb_port') || cfgConfig.env.KB_PORT || 5601,
    KB_INDEX: nconf.get('kb_index') || cfgConfig.env.KB_INDEX || '.kibana',
    KB_RENAME: nconf.get('kb_rename') || cfgConfig.env.KB_RENAME || '',
    HTTP_PORT: nconf.get('http_port') || cfgConfig.env.HTTP_PORT || 80,
    APP_NAME: pkg.name,
    // APP_VERSION: pkg['timings-api'].api_version || '0.0.0',
    APP_CONFIG: cfgFile,
    HOST: nconf.get('api_host') || nconf.get('host') || os.hostname(),
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

// Finally, load config object into nconf
nconf
  .use('memory')
  .defaults(cfgNconf);
