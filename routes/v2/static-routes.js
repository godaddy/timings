/**
 * Created by mverkerk on 9/25/2016.
 */

const os = require('os');
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
    },
    system: {
      OS: os.platform(),
      RELEASE: os.release(),
      OS_TYPE: os.type(),
      ARCH: os.arch(),
      MEM: 'free: ' + formatBytes(os.freemem()) + ' / total: ' + formatBytes(os.totalmem()),
      HOSTNAME: os.hostname(),
      UPTIME: secToTimeString(os.uptime())
    }
  };

  if (nconf.get('env:useES') === true) {
    ret.es = {
      ES_PROTOCOL: nconf.get('env:ES_PROTOCOL') || 'Not set!',
      ES_HOST: nconf.get('env:ES_HOST') || 'Not set!',
      ES_PORT: nconf.get('env:ES_PORT') || 'Not set!',
      INDEX_PERF: nconf.get('env:INDEX_PERF') || 'Not set!',
      INDEX_RES: nconf.get('env:INDEX_RES') || 'Not set!',
      INDEX_ERR: nconf.get('env:INDEX_ERR') || 'Not set!'
    };
    ret.kibana = {
      KB_HOST: nconf.get('env:KB_HOST') || 'Not set!',
      KB_PORT: nconf.get('env:KB_PORT') || 'Not set!'
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
