'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

/**
 * Repository root shared by every npm test script.
 */
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Independent, read-only checks which can safely run together before package generation.
 */
const STATIC_CHECKS = ['test-name-discrepancies', 'test-spellcheck', 'test-lint', 'test-types'];

/**
 * Runs a test script, collecting parallel output or streaming longer sequential phases.
 *
 * @param {string} script - Repository npm script to run.
 * @param {boolean} collect - Whether to collect output until the process closes.
 * @returns {Promise<number>} Exit status, including process startup failures.
 */
function runTestScript(script, collect = false) {
    console.info(`> ${script} started`);
    const startedAt = Date.now();

    return new Promise((resolve) => {
        const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
            cwd: PROJECT_ROOT,
            env: process.env,
            shell: process.platform === 'win32',
            stdio: collect ? ['inherit', 'pipe', 'pipe'] : 'inherit',
        });
        let output = '';
        let startupError;

        /**
         * Keeps stdout and stderr together without interleaving concurrent checks in the terminal.
         */
        const collectOutput = (chunk) => {
            output += chunk.toString();
        };

        child.stdout?.setEncoding('utf8').on('data', collectOutput);
        child.stderr?.setEncoding('utf8').on('data', collectOutput);
        child.once('error', (error) => {
            startupError = error;
        });
        child.once('close', (code, signal) => {
            const status = startupError ? 1 : code ?? 1;
            const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
            console.info(`\n> ${script}: ${status === 0 ? 'passed' : 'FAILED'} (${elapsedSeconds}s)`);
            process.stdout.write(output);

            if (startupError) {
                console.error(startupError.message);
            }
            if (signal) {
                console.error(`${script} terminated by ${signal}`);
            }

            resolve(status);
        });
    });
}

/**
 * Runs the existing test scope with parallel static checks and ordered generation, unit and browser phases.
 *
 * Package generation writes entrypoints consumed by later phases, so it must finish before those start.
 * Unit tests and the production browser build remain sequential to bound memory use on CI machines.
 * A failed static check waits for its siblings to close and prevents every later phase from starting.
 *
 * @param {{withoutPackageGeneration?: boolean, withoutUnit?: boolean}} options - Existing reduced test scopes.
 * @returns {Promise<number>} First failing phase's exit status, or zero when all selected checks pass.
 */
async function runTests({ withoutPackageGeneration = false, withoutUnit = false } = {}) {
    const statuses = await Promise.all(STATIC_CHECKS.map((script) => runTestScript(script, true)));
    const failure = statuses.find((status) => status !== 0);
    if (failure !== undefined) {
        return failure;
    }

    const remainingScripts = ['test-books', 'test-book-components-build'];
    if (!withoutPackageGeneration) {
        remainingScripts.push('test-package-generation');
    }
    if (!withoutUnit) {
        remainingScripts.push('test-unit');
    }
    if (!withoutPackageGeneration && !withoutUnit) {
        remainingScripts.push('test-app-agents-server');
    }

    for (const script of remainingScripts) {
        const status = await runTestScript(script);
        if (status !== 0) {
            return status;
        }
    }

    console.info('🎉 All tests passed!');
    return 0;
}

if (require.main === module) {
    const flags = process.argv.slice(2);
    const unknownFlag = flags.find((flag) => !['--without-package-generation', '--without-unit'].includes(flag));

    if (unknownFlag) {
        console.error(`Unknown test option: ${unknownFlag}`);
        process.exitCode = 1;
    } else {
        void runTests({
            withoutPackageGeneration: flags.includes('--without-package-generation'),
            withoutUnit: flags.includes('--without-unit'),
        })
            .then((status) => {
                process.exitCode = status;
            })
            .catch((error) => {
                console.error(error);
                process.exitCode = 1;
            });
    }
}

module.exports = { runTests };
