// const fs = require('fs');
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const express = require('express');
const bodyParser = require('body-parser');
let app;

// set up rate limiter: maximum of five requests per minute
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

function configureApp() {
  const logger = require('../log')(module.id, app);
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
    app.use(logger.access);
  }

  // Setup routes
  app.use(`v2/api/cicd/`, require(path.join(app.locals.appRootPath, 'routes', 'v2', 'post-routes')));
  app.use('/', require(path.join(app.locals.appRootPath, 'routes', 'v2', 'static-routes')));

  // Error logger (after router!)
  if (app.locals.env.LOG_PATH) {
    app.use(logger.error);
  }

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    if (req.xhr) {
      res.status(500).json({ message: 'Server error!' });
    } else if (req.method === 'GET') {
      // Catch-all for 'GET' requests -> Not Found page
      res.status(404).render('pages/404');
    } else {
      const err = new Error('Not Found');
      err.status = 404;
      return next(err);
    }
  });

  // Error handler
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    // Only log serious errors
    if (res.statusCode >= 500) {
      logger.log('error',
        res.statusCode +
        ' - ' + req.path +
        ' - ' + req.ip +
        ' - ' + req.method +
        ' - ' + err.toString()
      );
    }
    res.json({
      status: res.statusCode,
      message: err.toString().substring(0, 500).replace(/"/g, "'")
    });
    next();
  });

  app.locals.env.HTTP_PORT = app.locals.env.HTTP_PORT || 80;
  app.listen(app.locals.env.HTTP_PORT);

  logger.log('info', `[STATUS] - Server v${app.locals.env.APP_VERSION || '{unknown}'} is running at ` +
    `http://${app.locals.env.HOST}:${app.locals.env.HTTP_PORT}`);

}

module.exports = function (appObject) {
  if (appObject) {
    app = appObject;
    configureApp();
  }
  return app;
};
