const os = require('os');
const fs = require('fs');
const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const path = require('path');
const isDocker = require('is-docker');
const runES = require('../../src/v2/run-es');
const esUtils = require('../../src/v2/es-utils');
const kbUtils = require('../../src/v2/kb-utils');

const htmlDir = path.join(__dirname, '../../public/');

module.exports = function (app) {
  router.get('/*', function (req, res, next) {
    res.setHeader('Last-Modified', (new Date()).toUTCString());
    next();
  });

  // Views

  router.get(['/health*', '/v2/api/cicd/health*'], async function (req, res, next) {
    try {
      const apiHealth = await health();
      if (req.cookies.csrftoken) {
        res.render('pages/health', { apiHealth: JSON.stringify(apiHealth) });
      } else {
        res.json(apiHealth);
      }
    } catch (e) {
      return next(e);
    }
  });

  router.get('/', async function (req, res, next) {
    try {
      const apiHealth = await health();
      if (req.cookies.csrftoken) {
        res.render('pages/index', { apiHealth: JSON.stringify(apiHealth) });
      } else {
        res.json(apiHealth);
      }

    } catch (e) {
      return next(e);
    }
  });

  router.get('/swagger', function (req, res, next) {
    try {
      res.render('pages/swagger');
    } catch (e) {
      return next(e);
    }
  });

  router.get('/config', function (req, res, next) {
    try {
      const cfgFile = app.locals.env.APP_CONFIG;
      let config = {
        editable: true
      };
      try {
        if (cfgFile && fs.existsSync(cfgFile)) {
          if (cfgFile.endsWith('.json')) {
            config = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
          } else {
            config.error = `Sorry - your config file [${cfgFile}] is not JSON - we hope to add more options soon!`;
          }
        } else {
          config.error = `Sorry - could not open config file [${cfgFile}]!`;
        }
      } catch (e) {
        config.error = `Error fetching config file [${cfgFile}] - ${e}`;
      }
      if (req.cookies.csrftoken) {
        res.render('pages/config', { config: JSON.stringify(config) });
      } else {
        res.json(config);
      }

    } catch (e) {
      return next(e);
    }
  });

  router.get('/logs/:id', function (req, res, next) {
    try {
      res.render('pages/logs', { log: req.params.id || 'app' });
    } catch (e) {
      return next(e);
    }
  });

  router.get('/getlog', function (req, res, next) {
    try {
      const type = req.query.log;
      const logPath = app.locals.env.LOG_PATH;
      const logs = {
        editable: false
      };
      try {
        if (logPath && fs.existsSync(path.join(logPath, `${type}.log`))) {
          logs[type] = fs.readFileSync(path.join(logPath, `${type}.log`), 'utf8').split('\n').filter(Boolean);
        }
      } catch (e) {
        logs[type] = {
          error: `Error fetching log file [${path.join(logPath, `${type}.log`)}] - ${e}`
        };
      }
      res.json(logs);
    } catch (e) {
      return next(e);
    }
  });

  router.get('/waterfall', function (req, res, next) {
    try {
      res.render('pages/waterfall');
    } catch (e) {
      return next(e);
    }
  });

  router.get('/es_admin', async function (req, res, next) {
    try {
      const es = new runES.Elastic(app);
      const esInfo = await es.getEsInfo();
      if (req.cookies.csrftoken) {
        res.render('pages/es_admin', {
          esInfo: JSON.stringify(esInfo)
        });
      } else {
        res.json(esInfo);
      }
    } catch (e) {
      return next(e);
    }
  });

  // JSON responses

  router.get('/template_check', async function (req, res, next) {
    try {
      const es = new runES.Elastic(app);
      const checkTemplate = await es.checkUpgrade();
      res.json(checkTemplate);
    } catch (e) {
      return next(e);
    }
  });

  router.get('/es_check', async function (req, res, next) {
    try {
      const es = new runES.Elastic(app);
      const esInfo = await es.checkES();
      res.json(esInfo);
    } catch (e) {
      return next(e);
    }
  });

  router.get('/es_upgrade', async function (req, res, next) {
    try {
      const es = new runES.Elastic(app);
      const upgrade = await es.upgrade();
      res.json(upgrade);
    } catch (e) {
      return next(e);
    }
  });

  router.get('/es_import', async function (req, res, next) {
    try {
      const es = new esUtils.ESClass(app);
      const esImport = await es.esImport();
      res.json(esImport);
    } catch (e) {
      return next(e);
    }
  });

  router.get('/kb_import', async function (req, res, next) {
    try {
      const kb = new kbUtils.KBClass(app);
      const kbImport = await kb.kbImport();
      res.json(kbImport);
    } catch (e) {
      return next(e);
    }
  });

  router.get('/api-spec', function (req, res, next) {
    try {
      res.sendFile(htmlDir + 'api-docs/v2/index.yaml');
    } catch (e) {
      return next(e);
    }
  });

  async function health() {
    const ret = {
      app: {
        app_version: app.locals.env.APP_VERSION,
        app_host: app.locals.env.HOST + ':' + app.locals.env.HTTP_PORT,
        app_config: app.locals.env.APP_CONFIG,
        app_log_path: app.locals.env.LOG_PATH,
        app_log_level: (app.locals.env.LOG_LEVEL || 'info').toUpperCase(),
        app_is_docker: isDocker()
      }
    };

    // Add ELK info - if it's active
    const es = new runES.Elastic(app);
    await es.getEsInfo();
    if (app.locals.env.ES_ACTIVE) {
      ret.es = {
        es_version: app.locals.env.ES_VERSION || 'Unknown',
        es_active: app.locals.env.ES_ACTIVE,
        es_host: app.locals.env.ES_HOST || 'Not set!',
        es_port: app.locals.env.ES_PORT || 'Not set!',
        es_timeout: app.locals.env.ES_TIMEOUT || 'Not set!',
        es_build_hash: app.locals.env.ES_VERSION_INFO.build_hash || 'Unknown',
        es_build_date: app.locals.env.ES_VERSION_INFO.build_date || 'Unknown',
        es_lucene_version: app.locals.env.ES_VERSION_INFO.lucene_version || 'Unknown',
        es_timings_data: app.locals.env.HAS_TIMINGS_DATA,
        es_perf_index: app.locals.env.INDEX_PERF || 'Not set!',
        es_resource_index: app.locals.env.INDEX_RES || 'Not set!',
        es_error_index: app.locals.env.INDEX_ERR || 'Not set!'
      };
      let kbLink = 'n/a';
      if (app.locals.env.ES_ACTIVE === true) {
        kbLink = `${app.locals.env.ES_PROTOCOL}://${app.locals.env.KB_HOST}`;
        if (app.locals.env.KB_PORT !== 80) kbLink += `:${app.locals.env.KB_PORT}`;
        kbLink += '/app/kibana#/dashboard/TIMINGS-Dashboard';
      }
      ret.kibana = {
        kibana_version: app.locals.env.KB_VERSION || 'Unknown',
        kibana_build: app.locals.env.KB_BUILD || 'Unknown',
        kibana_status: app.locals.env.KB_STATUS || 'Unknown',
        kibana_host: app.locals.env.KB_HOST || 'Not set!',
        kibana_port: app.locals.env.KB_PORT || 'Not set!',
        kibana_items: app.locals.env.HAS_KB_ITEMS,
        kibana_link: encodeURIComponent(kbLink)
      };
    } else {
      ret.es = {
        es_version: '',
        es_active: app.locals.env.ES_ACTIVE,
        es_reason: app.locals.env.ES_REASON
      };
    }

    // Add system and Node info
    ret.system = {
      system_version: os.release(),
      system_platform: os.platform(),
      system_type: os.type(),
      system_hostname: os.hostname(),
      system_uptime: secToTimeString(os.uptime()),
      system_arch: os.arch(),
      system_memory: 'free: ' + formatBytes(os.freemem()) + ' / total: ' + formatBytes(os.totalmem())
    };

    ret.node = {
      node_version: app.locals.env.NODE_VERSIONS.node,
      node_env: app.locals.env.NODE_ENV,
      node_versions: app.locals.env.NODE_VERSIONS
    };

    return JSON.parse(JSON.stringify(ret));
  }

  function secToTimeString(sec) {
    let seconds = parseInt(sec, 10);

    const years = Math.floor(seconds / (365 * 3600 * 24));
    seconds -= years * 365 * 3600 * 24;
    const weeks = Math.floor(seconds / (7 * 3600 * 24));
    seconds -= weeks * 7 * 3600 * 24;
    const days = Math.floor(seconds / (3600 * 24));
    seconds -= days * 3600 * 24;
    const hrs = Math.floor(seconds / 3600);
    seconds -= hrs * 3600;
    var mnts = Math.floor(seconds / 60);
    seconds -= mnts * 60;
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

  return router;
};
