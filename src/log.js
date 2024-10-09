/* eslint-disable id-length */
import path from 'path';
import winston from 'winston';

const mainFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.simple(),
  winston.format.timestamp(),
  winston.format.json()
);

const logFileSettings = {
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  colorize: false
};

winston.loggers.add('app', {
  transports: [
    new winston.transports.Console({
      level: 'debug',
      colorize: true,
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.printf(info => {
          const msgs = Array.isArray(info.message) ? info.message : [info.message];
          let output = [];
          msgs.forEach(msg => {
            const line = [];
            // if (this.local) line.push('LOCAL RUN');
            line.push(info.timestamp);
            line.push(info.level.toUpperCase());
            if (info.caller) {
              line.push(info.caller);
            }
            if (info.level === 'error' && info.error) {
              line.push(`\n>>> Error: ${info.error.stack || info.error}`);
            }
            output.push(`[${line.join('][')}] ${msg}`);
          });
          // if (['warn', 'error'].includes(info.level)) {
          //   output = ['', `=`.repeat(100), ...output, `=`.repeat(100)];
          // }
          return output.join('\n');
        })
      )
    })
  ],
  exitOnError: false
});

function addLoggers(app) {
  if (app.locals.env.LOG_PATH) {
    // Add File transport for main logger (app.log)
    winston.loggers.get('app').add(
      new winston.transports.File({
        level: 'info',
        filename: path.resolve(app.locals.env.LOG_PATH, 'app.log'),
        format: mainFormat,
        ...logFileSettings
      })
    );
    winston.loggers.get('app').info(`[LOGGING] log path: ["${app.locals.env.LOG_PATH}"]`);
  } else {
    winston.loggers.get('app').warn(`[LOGGING] could not create log path - OUTPUT TO CONSOLE ONLY!`);
  }
  winston.loggers.get('app').info(`[LOGGING] log level: ${(app.locals.env.LOG_LEVEL || 'info').toUpperCase()}`);
}

// Export the initial (console only) logger
export default {
  ...winston.loggers.get('app'),
  addLoggers: addLoggers
};
