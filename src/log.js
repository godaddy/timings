const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const winston = require('winston');
const expressWinston = require('express-winston');
let caller;
let app;
let loggers;

/* eslint no-sync: 0 */
/* eslint id-length: 0 */
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

function createLoggers() {
  // Attempt to create logging path - custom path is leading (LOG_PATH variable)
  // - the first path that is successfully creates wins
  app.locals.env.LOG_PATH = createPath([
    app.locals.env.LOG_PATH,
    path.join('..', 'timings', 'logs'),
    `${os.homedir()}/timings/logs`,
    '/var/log/timings/logs',
    '/tmp/timings/logs',
    '/temp/timings/logs'
  ]);

  loggers = {
    // Main console logger
    app: winston.createLogger({
      transports: [
        new winston.transports.Console({
          level: 'debug',
          colorize: true,
          format: winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.timestamp(),
            winston.format.printf(info => {
              const msgs = Array.isArray(info.message) ? info.message : [info.message];
              const output = [];
              msgs.forEach(msg => {
                const line = [];
                if (this.local) line.push('LOCAL RUN');
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
              return output.join('\n');
            })
          )
        })
      ],
      exitOnError: false
    })
  };

  if (app.locals.env.LOG_PATH !== false) {
    // Add File transport for main logger (app.log)
    loggers.app.add(
      new winston.transports.File({
        level: 'info',
        filename: path.resolve(app.locals.env.LOG_PATH, 'app.log'),
        format: mainFormat,
        ...logFileSettings
      })
    );
    loggers.access = expressWinston.logger({
      expressFormat: true,
      meta: true,
      metaField: null,
      dynamicMeta: function () { return { timestamp: new Date().toISOString() }; },
      headerBlacklist: ['if-none-match', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'],
      transports: [new winston.transports.File({
        filename: path.resolve(app.locals.env.LOG_PATH, 'access.log'),
        ...logFileSettings
      })]
    });
    loggers.error = expressWinston.errorLogger({
      level: 'error',
      handleExceptions: true,
      humanReadableUnhandledException: true,
      transports: [new winston.transports.File({
        filename: path.resolve(app.locals.env.LOG_PATH, 'error.log'),
        ...logFileSettings
      })]
    });
    loggers.app.log('info', `[LOGGING] log path: ["${app.locals.env.LOG_PATH}"]`);
  } else {
    loggers.app.log('warn', `[LOGGING] could not create log path - OUTPUT TO CONSOLE ONLY!`);
  }
  loggers.app.log('info', `[LOGGING] log level: ${(app.locals.env.LOG_LEVEL || 'info').toUpperCase()}`);


  function createPath(paths) {
    let res = false;
    paths.forEach(trypath => {
      if (trypath) {
        trypath = path.resolve(trypath);
        if (!res && fs.pathExistsSync(path.resolve(trypath, 'app.log'))) { res = trypath; }
        if (res) { return; }
        try {
          fs.ensureDirSync(trypath);
          fs.accessSync(trypath, fs.W_OK);
          res = trypath;
          return;
        } catch (err) {
          loggers.app.log('error', `timings API - LOGGING - unable to create logging path ["${trypath}"]`, err);
          return;
        }
      }
    });
    return res;
  }
}

module.exports = (callingModule, appObject) => {
  const parts = callingModule.filename.split('/');
  caller = parts[parts.length - 2] + '/' + parts.pop();
  // caller = callerName === '.' ? 'server' : callerName.split('/').slice(-1)[0];
  if (appObject) {
    app = appObject;
    createLoggers();
  }
  return {
    log: function (level, message, error) {
      loggers.app.log(level, message, { caller: caller, error: error });
    },
    access: loggers.access,
    error: loggers.error
  };
};
