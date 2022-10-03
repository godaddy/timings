/* eslint no-console: 0 */
const expect = require('chai').expect;
const app = require('../../server');
const request = require('supertest')(app);

describe('GET endpoint ', function () {
  this.timeout(5000); // How long to wait for a response (ms)

  // GET - Home
  it('[/] should return Welcome page', (done) => {
    request.get('/')
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res).to.be.an('object');
        expect(res).to.have.property('ok');
        expect(res.ok).to.be.true;
        expect(res).to.have.property('text');
        expect(res.text).to.contain('Welcome');
        done();
      });
  });

  // GET - Home
  it('[/swagger] should return Swagger page', (done) => {
    request.get('/swagger')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res).to.be.an('object');
        expect(res).to.have.property('ok');
        expect(res.ok).to.be.true;
        expect(res).to.have.property('text');
        expect(res.text).to.contain('swagger-ui');
        done();
      });
  });

  // GET - Home
  it('[/config] should return Swagger page', (done) => {
    request.get('/config')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res).to.be.an('object');
        expect(res).to.have.property('ok');
        expect(res.ok).to.be.true;
        expect(res).to.have.property('text');
        expect(res.text).to.contain('ES_PROTOCOL');
        done();
      });
  });

  // GET - Home
  it('[/fail] should return Error page', (done) => {
    request.get('/fail')
      .expect(404)
      .expect('Content-Type', /text\/html/)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res).to.be.an('object');
        expect(res).to.have.property('ok');
        expect(res.ok).to.be.false;
        expect(res).to.have.property('text');
        expect(res.text).to.contain('You found the 404 page');
        done();
      });
  });

  // GET - Health
  it('[/health] should get the health JSON', (done) => {
    request.get('/health?f=json')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('app');
        expect(res.body).to.have.property('node');
        expect(res.body).to.have.property('system');
        done();
      });
  });

  // GET - Health
  it('[/healthcheck] should get the health JSON', (done) => {
    request.get('/healthcheck?f=json')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('app');
        expect(res.body).to.have.property('node');
        expect(res.body).to.have.property('system');
        done();
      });
  });

  // GET - waterfall
  it('[/waterfall] should return Waterfall page', (done) => {
    request.get('/waterfall')
      .expect(200)
      .expect('Content-Type', /text\/html/)
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

  // GET - waterfall
  it('[/es_admin] should return ES info page', (done) => {
    request.get('/es_admin')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .end((err, res) => {
        if (err) {
          console.log(JSON.stringify(res.body));
        }
        expect(res).to.be.an('object');
        expect(res).to.have.property('ok');
        expect(res.ok).to.be.true;
        expect(res).to.have.property('text');
        expect(res.text).to.contain('Elasticsearch is not in use');
        done();
      });
  });
});
