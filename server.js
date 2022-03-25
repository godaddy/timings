#!/usr/bin/env node
const path = require('path');
const express = require('express');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const semver = require('semver');
const pkg = require('./package.json');
let app;

// set up rate limiter: maximum of five requests per minute
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});


function createApp() {
  app = express();
  require('./src/v2/config')(app, __dirname);
  app.locals.env.NODE_VERSIONS = process.versions;
  app.logger.log('info', `[INIT] - Using config ["${app.locals.env.APP_CONFIG || '{unknown}'}"]`);
  app.logger.log('info', `[INIT] - NODE version: ${app.locals.env.NODE_VERSIONS.node}`);
  app.logger.log('info', `[INIT] - Elasticsearch host: [${app.locals.env.ES_HOST}:${app.locals.env.ES_PORT}]`);
  app.logger.log('info', `[INIT] - Kibana host: [${app.locals.env.KB_HOST}:${app.locals.env.KB_PORT}]`);
  app.logger.log('info', `[INIT] - timings-docker: [${app.locals.env.IS_DOCKER || 'false'}]`);

  // Add the current app version to the config
  const apiVer = semver.valid(pkg.version);
  app.locals.env.APP_VERSION = apiVer || 'unknown';
  app.set('view engine', 'ejs');

  // CORS middleware
  const allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Timing-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTION');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  };

  app.use(limiter);
  app.use(allowCrossDomain);
  app.use(cookieParser());
  app.use(bodyParser.json({ limit: '5mb', type: 'application/json' }));

  // Configure static content
  app.use('/public', express.static(path.join(app.locals.appRootPath, 'public')));
  app.use(favicon(path.join(app.locals.appRootPath, 'public', 'img', 'favicon.ico')));

  // Access logger (before router!)
  if (app.locals.env.LOG_PATH) {
    app.use(app.logger.access);
  }

  // Setup routes
  try {
    app.use('/', require(path.join(app.locals.appRootPath, 'routes', 'v2', 'static-routes'))(app));
    app.use('/api/', require(path.join(app.locals.appRootPath, 'routes', 'v2', 'static-routes'))(app));
    app.use(`/v2/api/cicd/`, require(path.join(app.locals.appRootPath, 'routes', 'v2', 'post-routes'))(app));
  } catch (err) {
    console.error(err);
  }

  // Error logger (after router!)
  if (app.locals.env.LOG_PATH) {
    app.use(app.logger.error);
  }

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    if (req.xhr) {
      res.status(500).json({ message: 'Server error!' });
    } else if (req.method === 'GET') {
      // Catch-all for 'GET' requests -> Not Found page
      res.status(404).render('pages/404', { originalUrl: req.originalUrl });
    } else {
      const err = new Error('Server error - sorry, we dont have much more information...');
      err.status = 500;
      return next(err);
    }
  });

  // Error handler
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    // Only log serious errors
    if (res.statusCode >= 500) {
      app.logger.log('error',
        res.statusCode +
        ' - ' + req.path +
        ' - ' + req.ip +
        ' - ' + req.method +
        ' - ' + err.toString()
      );
    }
    if (!req.baseUrl.startsWith('/api') && !req.xhr) {
      res.status(500).render('pages/500', { error: err, stack: err.stack });
    }
    res.json({
      status: res.statusCode,
      message: err.toString().substring(0, 500).replace(/"/g, "'")
    });
    next();
  });

  app.locals.env.HTTP_PORT = app.locals.env.HTTP_PORT || 80;
  app.listen(app.locals.env.HTTP_PORT);

  app.logger.log('info', `[INIT] - Server v${app.locals.env.APP_VERSION || '{unknown}'} is running at ` +
    `http://${app.locals.env.HOST}:${app.locals.env.HTTP_PORT}`);

  // Initialize ES
  const runES = require('./src/v2/run-es');
  const es = new runES.Elastic(app);
  es.esInit();

  return app;
}

if (!app) createApp();

module.exports = app;
