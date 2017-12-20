/**
 * Created by mverkerk on 9/25/2016.
 */
const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const puUtils = require('../../src/v2/perf-utils');
const joi = require('joi');
const bodyParser = require('body-parser');
const nconf = require('nconf');

var jsonParser = bodyParser.json();

router.post('/navtiming', jsonParser, (req, res, next) => {
  validateSchema('navtiming', req.body);
  const pu = new puUtils.PUClass(req.body, req.route.path);
  pu.handler((err, returnJSON) => {
    if (err) {
      pu.saveError(err, req);
      return next(err);
    }
    res.json(returnJSON);
  });
});

router.post('/usertiming', jsonParser, (req, res, next) => {
  validateSchema('usertiming', req.body);
  const pu = new puUtils.PUClass(req.body, req.route.path);
  pu.handler((err, returnJSON) => {
    if (err) {
      pu.saveError(err, req);
      return next(err);
    }
    res.json(returnJSON);
  });
});

router.post('/apitiming', jsonParser, (req, res, next) => {
  validateSchema('apitiming', req.body);
  const pu = new puUtils.PUClass(req.body, req.route.path);
  pu.handler((err, returnJSON) => {
    if (err) {
      pu.saveError(err, req);
      return next(err);
    }
    res.json(returnJSON);
  });
});

router.post('/resources', jsonParser, (req, res, next) => {
  validateSchema('resources', req.body);
  const pu = new puUtils.PUClass(req.body, req.route.path);
  pu.getResources(req, (err, returnJSON) => {
    if (err) {
      err.status = 500;
      return next(err);
    }
    res.json(returnJSON);
  });
});

router.post('/injectjs', jsonParser, (req, res, next) => {
  validateSchema('injectjs', req.body);
  const pu = new puUtils.PUClass(req.body, req.route.path);
  pu.getInjectJS(req, (err, returnJSON) => {
    if (err) {
      pu.saveError(err, req);
      return next(err);
    }
    res.json(returnJSON);
  });
});

function validateSchema(route, body) {
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
      debug: joi.boolean(),
      esTrace: joi.boolean(),
      esCreate: joi.boolean(),
      passOnFailedAssert: joi.boolean()
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
  const reqLogs = nconf.get('params:required');
  if (reqLogs.length > 0) {
    // reqLogs.push('log');
    for (let index of Object.keys(reqLogs)) {
      let requiredLog = reqLogs[index];
      if (requiredLog.indexOf('log.') === 0) {
        logObj[requiredLog.substring(4)] = joi.string();
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
      visualCompleteMark: joi.string().allow('')
    })
  };

  // Validate!!
  const validate = joi.validate(body, extendedSchema[route]);
  if (validate.error) {
    validate.error.status = 422;
    throw validate.error;
  }
}

module.exports = router;
