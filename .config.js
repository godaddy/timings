const config = {
  NODE_ENV: process.env.NODE_ENV,
  params: {
    //Required and default parameters
    required: ['log.test_info', 'log.env_tester', 'log.team', 'log.browser', 'log.env_target'],
    defaults: {
      baseline: {
        days: 7,
        perc: 75,
        padding: 1.2
      },
      flags: {
        assertBaseline: true,
        debug: false,
        esTrace: false,
        esCreate: true,
        passOnFailedAssert: false
      }
    }
  }
}

module.exports = config;