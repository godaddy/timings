/* eslint-disable no-sync */
/* eslint-disable no-undef */
import './config-generic-env.js';
import fs from 'fs-extra';
import mocks from '../__mocks__.js';
import fixtures from './fixtures.js';


// Get the current package version from package.json
const { version } = fs.readJsonSync(new URL('../../package.json', import.meta.url));

console.log(`Adding vitest globals - see 'test/setup/add-globals.js'`);
console.log(`Current package version: ${version}`);

// Add the global variables
globalThis.mocks = mocks;
globalThis.pkgVersion = version;
globalThis.fixtures = fixtures;
