'use strict';

const path = require('node:path');
const { runNpm, startNpm, startNpmWithCollectedOutput } = require('./run-npm.js');

/**
 * Root directory of the Agents Server app.
 */
const APP_ROOT = path.resolve(__dirname, '..');

/**
 * Runs the complete Agents Server E2E verification flow.
 *
 * App linting remains an explicit test phase, but it reads only the sources and therefore does not
 * depend on the production build. Both run at the same time and the flow waits for the slower one,
 * which is always the build. The build then skips its duplicate lint pass, and Playwright starts
 * that same build instead of compiling a second `.next-e2e` output through `webServer`.
 */
async function runE2eTests() {
    const commandOptions = {
        cwd: APP_ROOT,
    };

    const lintCompletion = startNpmWithCollectedOutput(['run', 'lint'], commandOptions);
    const buildStatus = await startNpm(['run', 'build-e2e', '--', '--no-lint'], commandOptions);
    const lintResult = await lintCompletion;

    console.log('\n> lint (ran next to the production build)\n');
    process.stdout.write(lintResult.output);

    if (lintResult.status !== 0) {
        process.exit(lintResult.status);
    }

    if (buildStatus !== 0) {
        process.exit(buildStatus);
    }

    runNpm(['exec', '--', 'playwright', 'test', ...process.argv.slice(2)], {
        ...commandOptions,
        environmentOverrides: {
            PTBK_E2E_BUILD_READY: 'true',
        },
    });
}

void runE2eTests();
