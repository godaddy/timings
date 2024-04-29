/**
 * Created by mverkerk on 9/25/2016.
 */
import fs from 'fs-extra';
import { Router } from 'express';
import crypto from 'crypto';
// eslint-disable-next-line new-cap
import joi from 'joi';
import bodyParser from 'body-parser';
import { PUClass } from '../../src/v2/perf-utils.js';
import { Elastic } from '../../src/v2/run-es.js';
import { setConfig } from '../../src/v2/config.js';
const router = new Router();

const jsonParser = bodyParser.json();

function decryptData({ encryptedBase64, symmetricKeyBase64, ivBase64, authTagBase64 }) {
  try {
  // Decode Base64 to Buffer
    const encryptedData = Buffer.from(encryptedBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const key = Buffer.from(symmetricKeyBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag); // Set the authentication tag

    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8'); // Finalize decryption

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null; // or handle error appropriately
  }
}

export default function (app) {
  router.post('/config', jsonParser, async (req, res, next) => {
    // Decode the ES_PASS if it's present
    if (req.body.env?.ES_PASS) {
      const decrypted = decryptData(req.body.env.ES_PASS);
      req.body.env.ES_PASS = decrypted;
    }

    // First check if ES_PASS has been updated - if not, set it back to the current value to prevent overwriting
    if (req.body.env?.ES_PASS === '********') {
      req.body.env.ES_PASS = app.locals.env.ES_PASS;
    }

    // Write the file and send the response
    try {
      const returnJSON = req.body;
      if (returnJSON.env?.ES_PASS) returnJSON.env.ES_PASS = '********';
      res.json(returnJSON);
      // eslint-disable-next-line no-sync
      fs.writeJsonSync(app.locals.env.APP_CONFIG, returnJSON);
      // Config updated - re-init the server
      const es = new Elastic(app);
      setConfig(app, app.locals.appRootPath);  // this resets the config!
      es.esInit();
    } catch (e) {
      return next(e);
    }
  });

  router.post('/navtiming', jsonParser, (req, res, next) => {
    const pu = new PUClass(req.body, req.route.path, mergeParams(req.body), app);
    validateSchema('navtiming', req, pu);
    pu.handler((err, returnJSON) => {
      if (err) {
        pu.saveError(err, req);
        return next(err);
      }
      res.json(returnJSON);
    });
  });

  router.post('/usertiming', jsonParser, (req, res, next) => {
    const pu = new PUClass(req.body, req.route.path, mergeParams(req.body), app);
    validateSchema('usertiming', req, pu);
    pu.handler((err, returnJSON) => {
      if (err) {
        pu.saveError(err, req);
        return next(err);
      }
      res.json(returnJSON);
    });
  });

  router.post('/apitiming', jsonParser, (req, res, next) => {
    const pu = new PUClass(req.body, req.route.path, mergeParams(req.body), app);
    validateSchema('apitiming', req, pu);
    pu.handler((err, returnJSON) => {
      if (err) {
        pu.saveError(err, req);
        return next(err);
      }
      res.json(returnJSON);
    });
  });

  router.post('/resources', jsonParser, (req, res, next) => {
    const pu = new PUClass(req.body, req.route.path, mergeParams(req.body), app);
    validateSchema('resources', req, pu);
    pu.getResources(req, (err, returnJSON) => {
      if (err) {
        err.status = 500;
        return next(err);
      }
      res.json(returnJSON);
    });
  });

  router.post('/injectjs', jsonParser, (req, res, next) => {
    const pu = new PUClass(req.body, req.route.path, mergeParams(req.body), app);
    validateSchema('injectjs', req, pu);
    pu.getInjectJS(req, (err, returnJSON) => {
      if (err) {
        pu.saveError(err, req);
        return next(err);
      }
      res.json(returnJSON);
    });
  });

  function mergeParams(body) {
    const confDefaults = app.locals.params.defaults;

    if (typeof body?.flags?.assertRum === 'boolean') {
      body.flags.assertBaseline = body.flags.assertRum;
      delete body.flags.assertRum;
    }
    return mergeDeep({}, confDefaults, body);
  }

  function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return mergeDeep(target, ...sources);
  }

  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  function validateSchema(route, req, pu) {
    // Schema for request validation (extended in individual routes)

    // Add base schema
    const baseSchema = joi.object({
      sla: joi.object({
        pageLoadTime: joi.number().integer(),
        visualCompleteTime: joi.number().integer()
      }).length(1).required(),
      baseline: joi.object({
        days: joi.number().integer(),
        perc: joi.number().integer().max(100),
        padding: joi.number().min(1),
        src: joi.string().allow(''),
        aggField: joi.string().allow(''),
        searchUrl: joi.string().allow(''),
        incl: joi.object(),
        excl: joi.object()
      }),
      flags: joi.object({
        assertBaseline: joi.boolean(),
        assertRum: joi.boolean(),
        debug: joi.boolean(),
        esTrace: joi.boolean(),
        esCreate: joi.boolean(),
        passOnFailedAssert: joi.boolean()
      }),
      multirun: joi.object({
        totalRuns: joi.number().integer().min(5).max(1000).required(),
        currentRun: joi.number().integer().min(1).max(joi.ref('totalRuns')).required(),
        id: joi.string().alphanum().min(6).required()
      }),
      log: joi.object({
        team: joi.string(),
        browser: joi.string()
      }).pattern(/[a-zA-Z0-9]{3,}/, joi.string()).required()
    });

    // Get the required 'log' parameters from main config
    const logObj = {
      team: joi.string(),
      browser: joi.string()
    };
    const reqLogs = app.locals.params.required;
    if (reqLogs.length > 0) {
      // reqLogs.push('log');
      for (const index of Object.keys(reqLogs)) {
        const requiredLog = reqLogs[index];
        if (requiredLog.indexOf('log.') === 0) {
          logObj[requiredLog.substring(4)] = joi.string().required();
        }
      }
    }

    const requiredSchema = baseSchema.keys({
      log: joi.object(logObj).pattern(/[a-zA-Z0-9]{3,}/, joi.string()).required()
    });

    // Add route specific entries
    const extendedSchema = {
      navtiming: requiredSchema.keys({
        injectJS: joi.object({
          time: joi.date().timestamp(),
          timing: joi.object({
            navigationStart: joi.date().timestamp().required()
          }).pattern(/[a-zA-Z0-9]{3,}/, joi.any()).required(),
          visualCompleteTime: joi.number(),
          url: joi.string().uri().required(),
          resources: joi.array()
        }).required()
      }),
      usertiming: requiredSchema.keys({
        injectJS: joi.object({
          time: joi.date().timestamp(),
          measureArray: joi.array().min(1).required(),
          url: joi.string().uri().required(),
          marks: joi.array()
        }).required()
      }),
      apitiming: requiredSchema.keys({
        timing: joi.object({
          startTime: joi.date().timestamp().required(),
          endTime: joi.date().timestamp().required()
        }).required(),
        url: joi.string().uri().required()
      }),
      resources: joi.object({
        id: joi.string().guid({
          version: [
            'uuidv4'
          ]
        }).required()
      }),
      injectjs: joi.object({
        injectType: joi.any().valid('navtiming', 'usertiming').required(),
        visualCompleteMark: joi.string().allow(''),
        stripQueryString: joi.boolean(),
        decoded: joi.boolean()
      })
    };

    // Validate!!
    const validate = extendedSchema[route].validate(req.body);
    // const validate = joi.validate(req.body, extendedSchema[route]);
    if (validate.error) {
      validate.error.status = 422;
      pu.saveError(validate.error, req);
      throw validate.error;
    }
  }

  return router;
}
