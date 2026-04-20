'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

/**
 * Absolute repository root used as the default working directory for verification steps.
 */
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Agents Server workspace used by the final lint/build verification steps.
 */
const AGENTS_SERVER_ROOT = path.join(PROJECT_ROOT, 'apps', 'agents-server');

/**
 * Platform-specific npm executable name.
 */
const NPM_COMMAND = 'npm';

/**
 * Ordered verification steps for `npm run test-for-ptbk-coder`.
 */
const TEST_FOR_PTBK_CODER_STEPS = [
    { script: 'test-name-discrepancies', cwd: PROJECT_ROOT },
    { script: 'test-spellcheck', cwd: PROJECT_ROOT },
    { script: 'test-lint', cwd: PROJECT_ROOT },
    { script: 'test-types', cwd: PROJECT_ROOT },
    { script: 'test-books', cwd: PROJECT_ROOT },
    { script: 'test-book-components-build', cwd: PROJECT_ROOT },
    { script: 'test-package-generation', cwd: PROJECT_ROOT },
    { script: 'test-unit', cwd: PROJECT_ROOT },
    { script: 'lint', cwd: AGENTS_SERVER_ROOT },
    { script: 'test-build', cwd: AGENTS_SERVER_ROOT },
];

/**
 * Runs one npm script and resolves only after the child process and its stdio streams are fully closed.
 *
 * @param {{script: string, cwd: string}} step - Verification step definition.
 * @returns {Promise<void>} Promise that resolves on success.
 */
function runVerificationStep(step) {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(`${NPM_COMMAND} run ${step.script}`, {
            cwd: step.cwd,
            stdio: 'inherit',
            env: process.env,
            shell: true,
        });

        childProcess.on('error', (error) => {
            reject(error);
        });

        childProcess.on('close', (code, signal) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(
                new Error(
                    `Verification step \`${step.script}\` failed with code ${String(code)} and signal ${String(signal)}.`,
                ),
            );
        });
    });
}

/**
 * Executes the Promptbook Coder verification suite from the lightest checks to the heaviest build step.
 */
async function main() {
    console.info('Note: Running from most lightweight to heaviest tests');

    for (const step of TEST_FOR_PTBK_CODER_STEPS) {
        await runVerificationStep(step);
    }

    console.info('🎉 All tests passed!');
}

void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
