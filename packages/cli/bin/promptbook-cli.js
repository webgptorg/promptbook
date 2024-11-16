#!/usr/bin/env node --no-warnings

//                     <- TODO: !!!!!! Is this try to get rid of deprecation warnings in node v23.2.0 working?

const { _CLI /* <- Note: [🥠] */ } = require('../umd/index.umd.js');

_CLI._initialize();

/**
 * TODO: [🕌] When more functionalities, rename
 */
