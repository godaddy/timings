/**
 * Created by mverkerk on 9/25/2016.
 */

const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const path = require('path');
// const config = require('../../.config.js');
const nconf = require('nconf');

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
      APP_HOST: nconf.get('env:HOST') + ':' + nconf.get('env:HTTP_PORT'),
      APP_NAME: nconf.get('env:APP_NAME'),
      APP_VERSION: nconf.get('env:APP_VERSION'),
      APP_CONFIG: nconf.get('env:APP_CONFIG'),
      NODE_ENV: nconf.get('env:NODE_ENV'),
      useES: nconf.get('env:useES')
    }
  };

  if (nconf.get('env:useES') === true) {
    ret.es = {
      HOST: nconf.get('env:ES_HOST') || 'Not set!',
      PORT: nconf.get('env:ES_PORT') || 'Not set!',
      INDEX_PERF: nconf.get('env:INDEX_PERF') || 'Not set!',
      INDEX_RES: nconf.get('env:INDEX_RES') || 'Not set!',
      INDEX_ERR: nconf.get('env:INDEX_ERR') || 'Not set!'
    };
    ret.kibana = {
      HOST: nconf.get('env:KB_HOST'),
      PORT: nconf.get('env:KB_PORT')
    };
  }

  return ret;

}

module.exports = router;
