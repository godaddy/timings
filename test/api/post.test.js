/* eslint no-console: 0 */
const expect = require('chai').expect;
const params = require('../params/params');
const app = require('../../server');
const request = require('supertest')(app);

describe('POST endpoint ', function () {
  this.timeout(5000); // How long to wait for a response (ms)

  // POST - injectJS
  it('[/injectjs] should get the correct inject code', (done) => {
    const objParams = params.v2.cicd.injectjs;
    request.post('/v2/api/cicd/injectjs')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('inject_code');
        expect(res.body.inject_code).to.be.a('string');
        expect(res.body.inject_code).to.contain('20visualCompleteTime');
        done();
      });
  });

  // POST - injectJS [FAIL]
  it('[/injectjs FAIL] should get the correct error', (done) => {
    request.post('/v2/api/cicd/injectjs')
      .send({ inject_type: 'error' })
      .expect('Content-Type', /json/)
      .expect(422)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.a('string');
        expect(res.body.message).to.contain('ValidationError');
        done();
      });
  });

  // POST - navtiming
  it('[/navtiming] should retrieve a successful navtiming response', (done) => {
    const objParams = params.v2.cicd.navtiming;
    request.post('/v2/api/cicd/navtiming')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('assert');
        expect(res.body.assert).to.be.true;
        expect(res.body).to.have.property('export');
        expect(res.body).to.have.property('debugMsg');
        expect(res.body).to.have.property('params');
        expect(res.body).to.have.property('timingInfo');
        done();
      });
  });

  // POST - navtiming multi-run First Run [FAIL]
  it('[/navtiming multi-run First Run FAIL] should get the correct error', (done) => {
    const objParams = params.v2.cicd.navtiming;
    // Following line causes the failure [missing First Run]
    objParams.multirun = {
      totalRuns: 5,
      currentRun: 2,
      id: 'abcdef'
    };
    request.post('/v2/api/cicd/navtiming')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(400)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.a('string');
        expect(res.body.message).to.contain('currentRun has to be 1 for the first run');
        done();
      });
  });

  // POST - navtiming multi-run ID [FAIL]
  it('[/navtiming multi-run ID FAIL] should get the correct error', (done) => {
    const objParams = params.v2.cicd.navtiming;
    // Following line causes the failure [missing ID]
    objParams.multirun = {
      totalRuns: 5,
      currentRun: 1
    };
    request.post('/v2/api/cicd/navtiming')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(422)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.a('string');
        expect(res.body.message).to.contain(`ValidationError: 'multirun.id' is required`);
        done();
      });
  });

  // POST - navtiming [FAIL]
  it('[/navtiming FAIL] should get the correct error', (done) => {
    const objParams = params.v2.cicd.navtiming;
    // Following line causes the failure [wrong url format]
    objParams.injectJS.url = objParams.injectJS.url.replace('http://', '').replace('https://', '');
    delete objParams.multirun;
    request.post('/v2/api/cicd/navtiming')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(422)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.a('string');
        expect(res.body.message).to.contain('must be a valid uri');
        done();
      });
  });

  // POST - usertiming
  it('[/usertiming] should retrieve a successful usertiming response', (done) => {
    const objParams = params.v2.cicd.usertiming;
    request.post('/v2/api/cicd/usertiming')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('assert');
        expect(res.body.assert).to.be.true;
        expect(res.body).to.have.property('export');
        expect(res.body).to.have.property('debugMsg');
        expect(res.body).to.have.property('params');
        expect(res.body).to.have.property('timingInfo');
        done();
      });
  });

  // POST - usertiming [FAIL]
  it('[/usertiming FAIL] should get the correct error', (done) => {
    const objParams = params.v2.cicd.usertiming;
    // Following line causes the failure [wrong url format]
    objParams.injectJS.url = objParams.injectJS.url.replace('http://', '').replace('https://', '');
    request.post('/v2/api/cicd/usertiming')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(422)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.a('string');
        expect(res.body.message).to.contain('must be a valid uri');
        done();
      });
  });

  // POST - apitiming
  it('[/apitiming] should retrieve a successful apitiming response', (done) => {
    const objParams = params.v2.cicd.apitiming;
    request.post('/v2/api/cicd/apitiming')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('assert');
        expect(res.body.assert).to.be.true;
        expect(res.body).to.have.property('export');
        expect(res.body).to.have.property('debugMsg');
        expect(res.body).to.have.property('params');
        expect(res.body).to.have.property('timingInfo');
        done();
      });
  });

  // POST - apitiming [FAIL]
  it('[/apitiming FAIL] should get the correct error', (done) => {
    const objParams = params.v2.cicd.apitiming;
    // Following line causes the failure [wrong url format]
    objParams.url = objParams.url.replace('http://', '').replace('https://', '');
    request.post('/v2/api/cicd/apitiming')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(422)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.a('string');
        expect(res.body.message).to.contain('must be a valid uri');
        done();
      });
  });

  // POST - Resources
  it('[/resources] should retrieve a successful resources response', (done) => {
    const objParams = params.v2.cicd.resources;
    request.post('/v2/api/cicd/resources')
      .send(objParams)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('kibana_host');
        expect(res.body).to.have.property('kibana_port');
        expect(res.body).to.have.property('resources');
        expect(res.body.resources).to.be.an('array');
        done();
      });
  });

  // POST - Resources [FAIL]
  it('[/resources FAIL] should get the correct error', (done) => {
    request.post('/v2/api/cicd/resources')
      .send({})
      .expect('Content-Type', /json/)
      .expect(422)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.a('string');
        expect(res.body.message).to.contain('\'id\' is required');
        done();
      });
  });
});
