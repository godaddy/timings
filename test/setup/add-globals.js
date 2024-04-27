/* eslint-disable no-sync */
/* eslint-disable no-undef */
import './config-generic-env.js';
import fs from 'fs';
import path from 'path';
import mocks from '../__mocks__.js';
import fixtures from './fixtures.js';

console.log('Adding vitest globals - see `test/setup/add-globals.js`');

// Get the current package version from package.json
const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageJsonData = fs.readFileSync(packageJsonPath);
const packageJson = JSON.parse(packageJsonData);
const { version } = packageJson;

// Add the global variables
globalThis.mocks = mocks;
globalThis.pkgVersion = version;
globalThis.fixtures = fixtures;
