require('dotenv').config({ path: './test/.env' });

// This is a JavaScript-based config file containing every Mocha option plus others.
// If you need conditional logic, you might want to use this type of config,
// e.g. set options via environment variables 'process.env'.
// Otherwise, JSON or YAML is recommended.

module.exports = {
  'allow-uncaught': false,
  'async-only': false,
  bail: false,
  'check-leaks': false,
  color: false,
  delay: false,
  diff: true,
  exit: false, // could be expressed as "'no-exit': true"
  extension: ['js', 'cjs', 'mjs'],
  'fail-zero': true,
  'forbid-only': false,
  'forbid-pending': false,
  'full-trace': false,
  global: ['jQuery', '$'],
  growl: false,
  ignore: ['/path/to/some/ignored/file'],
  'inline-diffs': true,
  jobs: 1,
  'node-option': ['unhandled-rejections=strict'], // without leading "--", also V8 flags
  package: './package.json',
  // parallel: true,  // mutually exclusive with --file!!
  recursive: true,
  reporter: 'spec',
  retries: 0,
  slow: '75',
  sort: false,
  timeout: '2000', // same as "timeout: '2s'"
  'trace-warnings': true, // node flags ok
  ui: 'bdd',
  'v8-stack-trace-limit': 100, // V8 flags are prepended with "v8-"
  watch: false,
  logVerbose: true,
  'watch-files': ['lib/**/*.js', 'test/**/*.js'],
  'watch-ignore': ['lib/vendor']
};