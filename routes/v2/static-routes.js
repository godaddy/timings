const os = require('os');
const fs = require('fs');
const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const path = require('path');
const nconf = require('nconf');
const isDocker = require('is-docker');

const htmlDir = path.join(__dirname, '../../public/');

router.get('/*', function (req, res, next) {
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next();
});

router.get('/', async function (req, res) {
  res.render('pages/index', {
    svrHealth: JSON.stringify(await health())
  });
});

router.get('/swagger', function (req, res) {
  res.render('pages/swagger');
});

router.get('/config', function (req, res) {
  const cfgFile = nconf.get('env:APP_CONFIG');
  let config = {};
  try {
    if (cfgFile && fs.existsSync(cfgFile)) {
      if (cfgFile.endsWith('.json')) {
        config = JSON.parse(fs.readFileSync(cfgFile));
      } else {
        config.error = `Sorry - your config file [${cfgFile}] is not JSON - we hope to add more options soon!`;
      }
    } else {
      config.error = `Sorry - could not open config file [${cfgFile}]!`;
    }
  } catch (e) {
    config.error = `Error fetching config file [${cfgFile}] - ${e}`;
  }
  res.render('pages/config', { config: JSON.stringify(config) });
});

router.get('/waterfall', function (req, res) {
  res.render('pages/waterfall');
});

router.get('/es_admin', async function (req, res) {
  const runEs = require('../../src/run-es');
  const es = new runEs.Elastic();
  const esInfo = await es.checkES();
  res.render('pages/es_admin', {
    esInfo: JSON.stringify(esInfo)
  });
});

router.get('/template_check', async function (req, res) {
  const runEs = require('../../src/run-es');
  const es = new runEs.Elastic();
  const checkTemplate = await es.checkUpgrade();
  res.json(checkTemplate);
});

router.get('/es_check', async function (req, res) {
  const runEs = require('../../src/run-es');
  const es = new runEs.Elastic();
  const esInfo = await es.checkES();
  res.json(esInfo);
});

router.get('/es_upgrade', async function (req, res) {
  const runEs = require('../../src/run-es');
  const es = new runEs.Elastic();
  const upgrade = await es.upgrade();
  res.json(upgrade);
});

router.get('/es_import', async function (req, res) {
  const esUtils = require('../../src/v2/es-utils');
  const es = new esUtils.ESClass();
  const esImport = await es.esImport();
  res.json(esImport);
});

router.get('/kb_import', async function (req, res) {
  const esUtils = require('../../src/v2/es-utils');
  const es = new esUtils.ESClass();
  const kbImport = await es.kbImport();
  res.json(kbImport);
});

router.get('/api-spec', function (req, res) {
  res.sendFile(htmlDir + 'api-docs/v2/index.yaml');
});

router.get(['/health*', '/v2/api/cicd/health*'], async function (req, res) {
  res.send(await health());
});

async function health() {
  const runES = require('../../src/run-es');
  const es = new runES.Elastic();
  await es.checkES();

  const ret = {
    api: {
      'api_version': nconf.get('env:APP_VERSION'),
      'API host': nconf.get('env:HOST') + ':' + nconf.get('env:HTTP_PORT'),
      'API config': nconf.get('env:APP_CONFIG'),
      'Elasticsearch active': nconf.get('env:useES'),
      'Logging path': nconf.get('env:LOG_PATH'),
      'Logging level': (nconf.get('log_level') || 'info').toUpperCase(),
      'NODE Env': nconf.get('env:NODE_ENV'),
      'Running in Docker': isDocker()
    },
    system: {
      'OS platform': os.platform(),
      'OS release': os.release(),
      'OS type': os.type(),
      'OS hostname': os.hostname(),
      'OS uptime': secToTimeString(os.uptime()),
      'Architecture': os.arch(),
      'Memory info': 'free: ' + formatBytes(os.freemem()) + ' / total: ' + formatBytes(os.totalmem())
    }
  };

  // Add ELK info - if it's active
  if (nconf.get('env:useES')) {
    ret.es = {
      'es_version': nconf.get('env:ES_VERSION') || 'Unknown',
      'Elasticsearch active': nconf.get('env:useES'),
      'Elasticsearch host': nconf.get('env:ES_HOST') || 'Not set!',
      'Elasticsearch port': nconf.get('env:ES_PORT') || 'Not set!',
      'Elasticsearch build hash': nconf.get('env:ES_VERSION_INFO').build_hash || 'Unknown',
      'Elasticsearch build date': nconf.get('env:ES_VERSION_INFO').build_date || 'Unknown',
      'Elasticsearch lucene version': nconf.get('env:ES_VERSION_INFO').lucene_version || 'Unknown',
      'Has Timings API data': nconf.get('env:HAS_TIMINGS_DATA'),
      'Elasticsearch timeout': nconf.get('env:ES_TIMEOUT') || 'Not set!',
      'Performance index': nconf.get('env:INDEX_PERF') || 'Not set!',
      'Resource index': nconf.get('env:INDEX_RES') || 'Not set!',
      'Error index': nconf.get('env:INDEX_ERR') || 'Not set!'
    };
    let kbLink = 'n/a';
    if (nconf.get('env:useES') === true) {
      kbLink = `<a href="${nconf.get('env:ES_PROTOCOL')}://${nconf.get('env:KB_HOST')}`;
      if (nconf.get('env:KB_PORT') !== 80) kbLink += `:${nconf.get('env:KB_PORT')}`;
      kbLink += '/app/kibana#/dashboard/TIMINGS-Dashboard" target="_blank">link</a>';
    }
    ret.kibana = {
      'kibana_version': nconf.get('env:KB_VERSION') || 'Unknown',
      'Kibana host': nconf.get('env:KB_HOST') || 'Not set!',
      'Kibana port': nconf.get('env:KB_PORT') || 'Not set!',
      'Imported items?': nconf.get('env:HAS_KB_ITEMS'),
      'Kibana Link': encodeURIComponent(kbLink)
    };
  } else {
    ret.es = {
      'Elasticsearch active': nconf.get('env:useES')
    };
  }
  return ret;
}

function secToTimeString(sec) {
  let seconds = parseInt(sec, 10);

  const years = Math.floor(seconds / (365 * 3600 * 24));
  seconds  -= years * 365 * 3600 * 24;
  const weeks = Math.floor(seconds / (7 * 3600 * 24));
  seconds  -= weeks * 7 * 3600 * 24;
  const days = Math.floor(seconds / (3600 * 24));
  seconds  -= days * 3600 * 24;
  const hrs   = Math.floor(seconds / 3600);
  seconds  -= hrs * 3600;
  var mnts = Math.floor(seconds / 60);
  seconds  -= mnts * 60;
  const string = years + 'y:' + weeks + 'w:' + days + 'd:' + hrs + 'h:' + mnts + 'm:' + seconds + 's';

  return string;
}

function formatBytes(bytes, decimals) {
  if (bytes === 0) return '0 Bytes';
  var k = 1024,
    dm = decimals || 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

module.exports = router;
