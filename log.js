const fs = require('fs');
const path = require('path');
const winston = require('winston');
const nconf = require('nconf');

/* eslint no-sync: 0 */
let logPath = path.resolve((nconf.get('log_path') || './logs/'));
let logPathErr = false;
if (!fs.existsSync(logPath)) {
  // Path does not exist - create it!
  try {
    fs.mkdirSync(logPath);
  } catch (err) {
    // Could not create path - set path to working dir!
    logPathErr = true;
    logPath = path.resolve('.');
  }
}

const mainFormat = winston.format.combine(
  winston.format.simple(),
  winston.format.timestamp(),
  winston.format.printf(info => `[${info.timestamp}][${info.level}] - ${info.message}`)
);

/* eslint id-length: 0 */
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      format: mainFormat,
      level: 'info',
      filename: path.resolve(logPath, 'app.log'),
      handleExceptions: true,
      humanReadableUnhandledException: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false
    }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), mainFormat),
      level: 'info',
      handleExceptions: true
    })
  ],
  exitOnError: false
});

const accessLog = winston.createLogger({
  transports: [
    new winston.transports.File({
      format: mainFormat,
      level: 'info',
      filename: path.resolve(logPath, 'access.log'),
      handleExceptions: false,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exitOnError: false
});

// Set logging level based on LOG_LEVEL env variable
logger.transports.find(transport => {
  transport.level = (nconf.get('log_level') || 'info');
});

if (logPathErr === true) {
  logger.log('error', `timings API - LOGGING - unable to create logging in path ` +
    `["${path.resolve((nconf.get('log_path') || './logs/'))}"]!`);
}
logger.log('info', `timings API - LOGGING - log level: ${(nconf.get('log_level') || 'info').toUpperCase()}`);
logger.log('info', `timings API - LOGGING - logs files stored in: ["${logPath}"]`);

module.exports = logger;
module.exports.stream = {
  write: function (message) {
    accessLog.info(message.slice(0, -1));
  }
};
