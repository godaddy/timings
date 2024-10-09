#!/usr/bin/env node
/* eslint-disable no-process-exit */
/* eslint-disable id-length */
import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import expressWinston from 'express-winston';
import { fileURLToPath } from 'url';
import express from 'express';
import favicon from 'serve-favicon';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import semver from 'semver';
import rateLimit from 'express-rate-limit';
import { Elastic } from './src/v2/run-es.js';
import { setConfig } from './src/v2/config.js';
import staticRoutes from './routes/v2/static-routes.js';
import postRoutes from './routes/v2/post-routes.js';

// Workaround for __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logFileSettings = {
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  colorize: false
};

// Loading package.json content
const pkg = fs.readJsonSync(new URL('./package.json', import.meta.url));

let app;

// set up rate limiter: maximum of five requests per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});


async function createApp() {
  app = express();
  setConfig(app, __dirname);
  app.locals.env.NODE_VERSIONS = process.versions;
  app.logger.info(`[INIT] Using config ["${app.locals.env.APP_CONFIG || '{unknown}'}"]`);
  app.logger.info(`[INIT] NODE version: ${app.locals.env.NODE_VERSIONS.node}`);
  app.logger.info(`[INIT] Elasticsearch host: [${app.locals.env.ES_HOST}:${app.locals.env.ES_PORT}]`);
  app.logger.info(`[INIT] Kibana host: [${app.locals.env.KB_HOST}:${app.locals.env.KB_PORT}]`);
  app.logger.info(`[INIT] timings-docker: [${app.locals.env.IS_DOCKER || 'false'}]`);

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
    app.use(expressWinston.logger({
      expressFormat: true,
      meta: true,
      metaField: null,
      dynamicMeta: function () { return { timestamp: new Date().toISOString() }; },
      headerBlacklist: ['if-none-match', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'],
      transports: [new winston.transports.File({
        filename: path.resolve(app.locals.env.LOG_PATH, 'access.log'),
        ...logFileSettings
      })]
    }));
  }


  // Setup routes
  try {
    app.use('/', staticRoutes(app));
    app.use(`/v2/api/cicd/`, postRoutes(app));
  } catch (err) {
    console.error(err);
  }

  // Error logger (after router!)
  if (app.locals.env.LOG_PATH) {
    app.use(expressWinston.errorLogger({
      level: 'error',
      handleExceptions: true,
      humanReadableUnhandledException: true,
      transports: [new winston.transports.File({
        filename: path.resolve(app.locals.env.LOG_PATH, 'error.log'),
        ...logFileSettings
      })]
    }));
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
      app.logger.error(`${res.statusCode}-${req.path}-${req.ip}-${req.method}-${err.toString()}`);
    }
    if (!req.url.indexOf('/api/') < 0 && req.query?.f !== 'json' && !req.xhr) {
      res.status(500).render('pages/500', { error: err, stack: err.stack });
    }
    res.json({
      status: res.statusCode,
      message: err.toString().substring(0, 500).replace(/"/g, "'")
    });
    next();
  });

  app.locals.env.HTTP_PORT = app.locals.env.HTTP_PORT || 80;

  return await startAppListen(app);
}

async function startAppListen() {
  app.listen(app.locals.env.HTTP_PORT, () => {
    app.logger.info(`[INIT] Server v${app.locals.env.APP_VERSION || '{unknown}'} is running at ` +
      `http://${app.locals.env.HOST}:${app.locals.env.HTTP_PORT}`);
    // Initialize ES
    if (app.locals.env.ES_HOST) {
      const es = new Elastic(app);
      es.esInit();
    } else {
      app.locals.env.ES_ACTIVE = false;
    }
    return app;
  }).on('error', async (err) => {
    if (err.code === 'EACCES') {
      app.logger.warn(`[ERROR] Port ${app.locals.env.HTTP_PORT} requires elevated privileges - trying fallback port 8088`);
      // try again but on port 8088
      app.locals.env.HTTP_PORT = 8088;
      await startAppListen();
    } else if (err.code === 'EADDRINUSE') {
      app.logger.error(`[ERROR] Port ${app.locals.env.HTTP_PORT} is already in use`);
      process.exit(1);
    } else {
      app.logger.error(`[ERROR] Failed to start the server: ${err}`);
      process.exit(1);
    }
  });
}

if (!app) await createApp();

export { app };
