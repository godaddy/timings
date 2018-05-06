const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const winston = require('winston');
const nconf = require('nconf');

/* eslint no-sync: 0 */
/* eslint id-length: 0 */
const mainFormat = winston.format.combine(
  winston.format.simple(),
  winston.format.timestamp(),
  winston.format.printf(info => `[${info.timestamp}][${info.level}] - ${info.message}`)
);

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), mainFormat),
      level: (nconf.get('log_level') || 'info'),
      handleExceptions: true
    })
  ],
  exitOnError: false
});

// Attempt to create logging path - custom path is leading (LOG_PATH variable)
const logPath = createPath([
  (nconf.get('log_path') || `${__dirname}/logs`), `${os.homedir()}/timings_logs`, '/tmp/timings_logs', '/temp/timings_logs'
]);
nconf.set('env:LOG_PATH', logPath);

module.exports = logger;

if (logPath !== false) {
  // Add File log (app.log)
  logger.add(
    new winston.transports.File({
      format: mainFormat,
      level: 'info',
      filename: path.resolve(logPath, 'app.log'),
      handleExceptions: true,
      humanReadableUnhandledException: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false
    })
  );
  // Create access log
  const accessLog = winston.createLogger({
    transports: [
      new winston.transports.File({
        format: mainFormat,
        level: 'info',
        filename: path.resolve(logPath, 'access.log'),
        handleExceptions: false,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        colorize: false
      })
    ],
    exitOnError: false
  });

  module.exports.stream = {
    write: function (message) {
      accessLog.info(message.slice(0, -1));
    }
  };
}

logger.log('info', `timings API - LOGGING - logs files stored in: ["${logPath ? logPath : 'out put to console only'}"]`);
logger.log('info', `timings API - LOGGING - log level: ${(nconf.get('log_level') || 'info').toUpperCase()}`);

function createPath(paths) {
  let logPath = false;
  paths.forEach(trypath => {
    trypath = path.resolve(trypath);
    if (!logPath && fs.pathExistsSync(path.resolve(trypath, 'app.log'))) { logPath = trypath; }
    if (logPath) { return; }
    try {
      fs.ensureDirSync(trypath);
      fs.accessSync(trypath, fs.W_OK);
      logPath = trypath;
      return;
    } catch (err) {
      logger.log('warn', `timings API - LOGGING - unable to create logging path ["${trypath}"] - Error: ${err.message}`);
      return;
    }
  });
  return logPath;
}
