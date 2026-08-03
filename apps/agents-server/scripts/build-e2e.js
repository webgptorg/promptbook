'use strict';

const path = require('node:path');
const { APP_E2E_ENV } = require('../tests/e2e/e2eEnvironment.cjs');
const { runNpm } = require('./run-npm.js');

/**
 * Root directory of the Agents Server app.
 */
const APP_ROOT = path.resolve(__dirname, '..');

/**
 * Builds the production bundle used by the Agents Server E2E tests.
 *
 * The E2E environment is applied while compiling so public values such as the
 * mocked Supabase URL are embedded consistently in browser bundles.
 */
function buildE2eServer() {
    const buildArguments = ['run', 'build'];

    if (process.argv.includes('--no-lint')) {
        buildArguments.push('--', '--no-lint');
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
