/**
 * Created by mverkerk on 9/25/2016.
 */

const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const path = require('path');
const config = require('../../.config.js');

const htmlDir = path.join(__dirname, '../../public/');

router.get('/', function (req, res) {
  res.sendFile(htmlDir + 'index.html');
});

router.get('/waterfall', function (req, res) {
  res.sendFile(htmlDir + 'waterfall.html');
});

router.get('/health*', function (req, res) {
  res.send(health());
});

router.get('/v2/api/cicd/health*', function (req, res) {
  res.send(health());
});

// // Catch-all -> Not Found page
// router.get('*', function (req, res) {
//   res.sendFile(htmlDir + '404.html');
// });

function health() {
  const ret = {
    server: {
      host: config.env.HOST + ':' + config.env.HTTP_PORT,
      version: config.env.APP_VERSION,
      NODE_ENV: config.env.NODE_ENV,
      useES: config.params.useES
    }
  };

  if (config.params.useES === true) {
    ret.es = {
      HOST: config.env.ES_HOST || 'Not set!',
      PORT: config.env.ES_PORT || 'Not set!',
      INDEX_PERF: config.env.INDEX_PERF || 'Not set!',
      INDEX_RES: config.env.INDEX_RES || 'Not set!',
      INDEX_ERR: config.env.INDEX_ERR || 'Not set!'
    };
    ret.kibana = {
      HOST: config.env.KB_HOST,
      PORT: config.env.KB_PORT
    };
  }

  return ret;

}

module.exports = router;
