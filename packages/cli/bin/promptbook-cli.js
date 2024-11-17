#!/usr/bin/env node

// Disable deprecation warnings programmatically
process.noDeprecation = true;
//                       <- TODO: !!!!!! Is this try to get rid of deprecation warnings in node v23.2.0 working?

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { _CLI } = require('../umd/index.umd.js');

_CLI._initialize();

/**
 * TODO: [🕌] When more functionalities, rename
 */
