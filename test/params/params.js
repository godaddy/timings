const commonFlags = {
  assertBaseline: true,
  debug: true,
  esTrace: true,
  esCreate: false,
  passOnFailedAssert: false
};

const commonLog = {
  team: 'perfeng',
  test_info: 'test V2',
  env_tester: 'test',
  browser: 'Chrome',
  env_target: 'local'
};

module.exports = {
  v2: {
    cicd: {
      injectjs: {
        injectType: 'navtiming',
        visualCompleteMark: 'visual_complete'
      },
      navtiming: {
        injectJS: {
          time: new Date().getTime(),
          timing: {
            navigationStart: 1474997675801,
            unloadEventStart: 0,
            unloadEventEnd: 0,
            redirectStart: 0,
            redirectEnd: 0,
            fetchStart: 1474997676866,
            domainLookupStart: 1474997676867,
            domainLookupEnd: 1474997676867,
            connectStart: 1474997676867,
            connectEnd: 1474997676905,
            secureConnectionStart: 1474997676880,
            requestStart: 1474997676905,
            responseStart: 1474997676990,
            responseEnd: 1474997677298,
            domLoading: 1474997676998,
            domInteractive: 1474997677402,
            domContentLoadedEventStart: 1474997677402,
            domContentLoadedEventEnd: 1474997677403,
            domComplete: 1474997677527,
            loadEventStart: 1474997677527,
            loadEventEnd: 1474997677534
          },
          visualCompleteTime: 1734,
          url: 'www.w3.org/webperf/'
        },
        sla: { pageLoadTime: 4000 },
        flags: commonFlags,
        log: commonLog
      },
      usertiming: {
        injectJS: {
          time: new Date().getTime(),
          measureArray: [{
            name: 'test',
            entryType: 'measure',
            startTime: 236377.80000000002,
            duration: 5345.174999999988
          }],
          url: 'www.w3.org/webperf/',
          marks: [{
            name: 'test_start',
            entryType: 'mark',
            startTime: 236377.80000000002,
            duration: 0
          },
          {
            name: 'test_stop',
            entryType: 'mark',
            startTime: 241722.975,
            duration: 0
          }
          ]
        },
        sla: { pageLoadTime: 6000 },
        flags: commonFlags,
        log: commonLog
      },
      apitiming: {
        timing: {
          startTime: 1474997676867,
          endTime: 1474997676905
        },
        url: 'api.someapi.com',
        sla: {
          pageLoadTime: 200
        },
        flags: commonFlags,
        log: commonLog
      },
      resources: {
        id: 'fb20419b-0ec9-4e9f-8a2e-143884211469'
      }
    }
  }
};
