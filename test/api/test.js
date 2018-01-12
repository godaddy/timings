/* eslint no-console: 0 */
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest('http://localhost:8080');
const params = require('../params/params');

describe('Endpoint ', function () {
  this.timeout(5000); // How long to wait for a response (ms)

  before(function () {

  });

  after(function () {

  });

  // GET - Health
  it('should get the health JSON', (done) => {
    api.get('/health')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('server');
        expect(res.body).to.have.property('system');
        done();
      });
  });

  // POST - injectJS
  it('[/injectjs] should get the correct inject code', (done) => {
    const objParams = params.v2.cicd.injectjs;
    api.post('/v2/api/cicd/injectjs')
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
    api.post('/v2/api/cicd/injectjs')
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
    api.post('/v2/api/cicd/navtiming')
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

  // POST - navtiming [FAIL]
  it('[/navtiming FAIL] should get the correct error', (done) => {
    const objParams = params.v2.cicd.navtiming;
    // Following line causes the failure [wrong url format]
    objParams.injectJS.url = objParams.injectJS.url.replace('http://', '').replace('https://', '');
    api.post('/v2/api/cicd/navtiming')
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
    api.post('/v2/api/cicd/usertiming')
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
    api.post('/v2/api/cicd/usertiming')
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
    api.post('/v2/api/cicd/apitiming')
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
    api.post('/v2/api/cicd/apitiming')
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

  // it('[/resources] should retrieve an array of resources', (done) => {
  //   const objParams = params.v2.cicd.resources;
  //   api.post('/v2/api/cicd/resources')
  //     .send(objParams)
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) {
  //         console.log(JSON.stringify(res.body));
  //       }
  //       expect(res.body).to.be.an('object');
  //       expect(res.body).to.have.property('kibana_host');
  //       expect(res.body).to.have.property('kibana_port');
  //       expect(res.body).to.have.property('resources');
  //       expect(res.body.resources).to.be.an('array');
  //       done();
  //     });
  // });

  it('[/resources FAIL] should get the correct error', (done) => {
    api.post('/v2/api/cicd/resources')
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

  it('[/waterfall] should return HTML', (done) => {
    api.get('/waterfall')
      .expect('Content-Type', /html/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res).to.be.an('object');
        expect(res).to.have.property('ok');
        expect(res.ok).to.be.true;
        expect(res).to.have.property('text');
        expect(res.text).to.contain('Waterfall');
        done();
      });
  });
});
