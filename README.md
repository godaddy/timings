# TIMINGS API

[![Build Status](https://travis-ci.org/godaddy/timings.svg?branch=master)](https://travis-ci.org/godaddy/timings) [![npm version](https://badge.fury.io/js/timings.svg)](https://www.npmjs.com/package/timings) [![Node version](https://img.shields.io/node/v/timings.svg?style=flat)](http://nodejs.org/download/) [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/godaddy/timings/issues)

## **IMPORTANT NOTICE: SIGNIFICANT UPDATE to 2.0.0**

This version of the Timings API introduces a few major updates and you should carefully read the following announcements!

> **If you have used this repo/product before or if you are a current user, you may face a few challenges and/or breaking changes!
> Make sure you pay close attention when updating to a new version of Elasticsearch!**

## Main changes

1. Upgrade to Elasticsearch & Kibana 7 ... only!
   - the amount of coding & maintenance involved in supporting three major versions of Elastic turned out to be too much to handle
   - **You can follow the steps in this document to upgrade your data: [Upgrade elastic](https://github.com/mverkerk-godaddy/timings-docker/tree/master/docs/UPDATING.md)**
   - If you start the API and point it at an Elastic stack that has a version `< 7.x`, the API will work but no data will be written to Elasticsearch
2. The minimum node version has been bumped to 16.x
   - **Please upgrade to nodejs 16.x or higher if you want to run the API stand-alone**
3. A new admin UI - offering:
   - an overview of the main components and their status
   - ability to change & save your config
   - log viewer giving you insight into the app, access and error logs
   - the swagger page (moved from being the main page to being embedded in the new UI)
4. The config file now has to be in `.json` format
   - previous versions also allowed `.js` and `.yml|.yaml` formats - that is no longer the case
   - **Please convert your config file to `.json` format!**

For other changes, please see the [CHANGELOG](./CHANGELOG.md)

## Recommendations

It is highly recommended that you run this product in a Docker environment using the [timings-docker](https://mverkerk-godaddy/timings-docker) repo. This repo provides a convenient way to run the timings API as well as the currently supported Elastic Stack.

If you do (or have to) run the API stand-alone and/or run your own Elastic stack, the recommended versions are:

- nodejs: 17.x
- Elastic stack: 7.17.0
  - elastic stack 8.x has not been tested yet!

again, if you're updating your Elasticsearch data, you can use the upgrade steps outlined here: [timings-docker -> UPDATING.md](https://github.com/mverkerk-godaddy/timings-docker/tree/master/docs/UPDATING.md)

## How to use

You can find extended documentation for the timings API here: [USAGE.md](./docs/USAGE.md)

The timings API can be run "stand-alone" as a node/express application, with or without Elasticsearch for data storage:

- Stand-alone:
  - The API can be used to collect performance metrics from web pages and/or API endpoints during integration/UI tests
- With elasticsearch:
  - The API can be used to collect performance metrics from web pages and/or API endpoints during integration/UI tests
  - The API will use historical data stored in Elasticsearch for baselining and will return any (dynamic) threshold breaches in the responses
  - Kibana can be used to visualize historical data
