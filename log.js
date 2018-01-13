const fs = require('fs');
var winston = require('winston');
winston.emitErrs = true;

/* eslint no-sync: 0 */
var logger = new winston.Logger({
  transports: [
    new winston.transports.File({
      level: 'info',
      filename: './logs/app.log',
      handleExceptions: true,
      json: false,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false
    }),
    new winston.transports.Console({
      level: 'debug',
      handleExceptions: true,
      json: false,
      colorize: true
    })
  ],
  exitOnError: false
});

if (!fs.existsSync('./logs/')) {
  fs.mkdirSync('logs');
}

var accessLog = new winston.Logger({
  transports: [
    new winston.transports.File({
      level: 'info',
      filename: './logs/access.log',
      handleExceptions: false,
      json: false,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false
    })
  ],
  exitOnError: false
});

module.exports = logger;
module.exports.stream = {
  write: function (message) {
    accessLog.info(message.slice(0, -1));
  }
};
