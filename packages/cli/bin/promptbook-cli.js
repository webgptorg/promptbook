#!/usr/bin/env node
//               <- TODO: [🎺] Ensure correct version of Node.js is used

/**
 * Note: [🔺] Purpose of this file is to run CLI in production environment
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { _CLI } = require('../umd/index.umd.js');

_CLI._initialize_promptbookCli();

/**
 * TODO: !!! During the build check that this file exists
 * TODO: [🕌] When more functionalities, rename
 */
