'use strict';

const path = require('node:path');
const { runNpm } = require('./run-npm.js');

/**
 * Root directory of the Agents Server app.
 */
const APP_ROOT = path.resolve(__dirname, '..');

/**
 * Runs the complete Agents Server E2E verification flow.
 *
 * App linting remains an explicit test phase. The production build then skips
 * its duplicate lint pass, and Playwright starts that same build instead of
 * compiling a second `.next-e2e` output through `webServer`.
 */
function runE2eTests() {
    const commandOptions = {
        cwd: APP_ROOT,
    };

    runNpm(['run', 'lint'], commandOptions);
    runNpm(['run', 'build-e2e', '--', '--no-lint'], commandOptions);

    runNpm(['exec', '--', 'playwright', 'test', ...process.argv.slice(2)], {
        ...commandOptions,
        environmentOverrides: {
            PTBK_E2E_BUILD_READY: 'true',
        },
    });
}

runE2eTests();
