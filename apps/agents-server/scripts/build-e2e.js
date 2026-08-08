'use strict';

const path = require('node:path');
const { APP_E2E_ENV } = require('../tests/e2e/e2eEnvironment.cjs');
const { runNpm } = require('./run-npm.js');

/**
 * Root directory of the Agents Server app.
 */
const APP_ROOT = path.resolve(__dirname, '..');

/**
 * Production build arguments which every E2E build applies.
 *
 * The homepage prerender starts one more production server only to download `/` into an HTML
 * snapshot which nothing reads afterwards. Every E2E build is started by Playwright right after it
 * is compiled, and the tests open the homepage against that very same server, so the snapshot would
 * only repeat work the tests already do.
 */
const E2E_BUILD_ARGUMENTS = ['--no-homepage-prerender'];

/**
 * Builds the production bundle used by the Agents Server E2E tests.
 *
 * The E2E environment is applied while compiling so public values such as the
 * mocked Supabase URL are embedded consistently in browser bundles.
 */
function buildE2eServer() {
    const buildArguments = ['run', 'build', '--', ...E2E_BUILD_ARGUMENTS];

    if (process.argv.includes('--no-lint')) {
        buildArguments.push('--no-lint');
    }

    runNpm(buildArguments, {
        cwd: APP_ROOT,
        environmentOverrides: APP_E2E_ENV,
    });

    if (process.argv.includes('--start')) {
        runNpm(['run', 'start'], {
            cwd: APP_ROOT,
            environmentOverrides: APP_E2E_ENV,
        });
    }
}

buildE2eServer();
