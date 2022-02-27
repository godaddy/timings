// const fs = require('fs');
const path = require('path');
const express = require('express');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const nconf = require('nconf');
const logger = require('../log.js');

const app = express();

// set up rate limiter: maximum of five requests per minute
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

const API_VERSIONS = { version2: '/v2' };
app.set('API_VERSIONS', API_VERSIONS);
app.set('config', nconf.get());
app.set('view engine', 'ejs');

// CORS middleware
const allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Timing-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTION');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
};

// Overriding "Express" logger
if (nconf.get('env:LOG_PATH')) {
  app.use(require('morgan')('combined', { stream: logger.stream }));
}
app.use(limiter);
app.use(allowCrossDomain);
app.use(cookieParser());
app.use(bodyParser.json({ limit: '5mb', type: 'application/json' }));

// Create routes for static content
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.use(favicon(path.join(__dirname, '..', 'public', 'img', 'favicon.ico')));

for (const apiVersion of Object.keys(API_VERSIONS)) {
  const route = API_VERSIONS[apiVersion];
  app.use(route + '/api/cicd/', require('../routes' + route + '/post-routes'));
  app.use('/', require('../routes' + route + '/static-routes'));
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  req.config = nconf.get();
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
    logger.error(
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

module.exports = app;
