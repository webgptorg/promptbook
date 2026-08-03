'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

/**
 * Root directory of the Agents Server app.
 */
const APP_ROOT = path.resolve(__dirname, '..');

/**
 * Maximum Node.js heap size used by the Next.js production build.
 */
const AGENTS_SERVER_BUILD_MAX_OLD_SPACE_MIB = 8192;

/**
 * Runs the shared Agents Server production build and its homepage prerender step.
 *
 * The optional `--no-lint` argument is used by the E2E runner after the same app
 * lint command has already completed successfully.
 */
function buildAgentsServer() {
    const nextBuildArguments = [
        `--max-old-space-size=${AGENTS_SERVER_BUILD_MAX_OLD_SPACE_MIB}`,
        '-r',
        path.join(APP_ROOT, 'scripts', 'ignore-kill-eperm.js'),
        path.join(APP_ROOT, 'scripts', 'next-cli.js'),
        'build',
    ];

    if (process.argv.includes('--no-lint')) {
        nextBuildArguments.push('--no-lint');
    }

    runChildProcess(process.execPath, nextBuildArguments);
    runChildProcess(process.execPath, [path.join(APP_ROOT, 'scripts', 'prerender-homepage.js')]);
}

/**
 * Runs one child process and forwards its exit status.
 *
 * @param executablePath - Executable to run.
 * @param argumentsList - Arguments passed to the executable.
 */
function runChildProcess(executablePath, argumentsList) {
    const result = spawnSync(executablePath, argumentsList, {
        cwd: APP_ROOT,
        env: process.env,
        stdio: 'inherit',
    });

    if (result.error) {
        console.error(`Failed to run ${executablePath}:`, result.error);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

buildAgentsServer();
