// const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('../log.js');

const app = express();

const API_VERSIONS = { version2: '/v2' };
app.set('API_VERSIONS', API_VERSIONS);

// CORS middleware
const allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Timing-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTION');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
};

// Overriding "Express" logger
app.use(require('morgan')({ stream: logger.stream }));
app.use(allowCrossDomain);
app.use(cookieParser());
app.use(bodyParser.json({ limit: '5mb', type: 'application/json' }));

// Create routes for static content
app.use('/', express.static(path.join(__dirname, '..', 'public')));

for (const apiVersion of Object.keys(API_VERSIONS)) {
  const route = API_VERSIONS[apiVersion];
  app.use('/', require('../routes' + route + '/static-routes'));
  app.use(route + '/api/cicd/', require('../routes' + route + '/post-routes'));
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  if (req.xhr) {
    res.status(500).json({ message: 'Server error!' });
  } else if (req.method === 'GET') {
    // Catch-all for 'GET' requests -> Not Found page
    res.status(404).sendFile(path.join(__dirname, '..', 'public') + '/404.html');
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
    message: err.toString().substr(0, 500).replace(/"/g, "'")
  });
  next();
});

module.exports = app;
