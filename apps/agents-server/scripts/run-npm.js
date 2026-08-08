'use strict';

const { spawn, spawnSync } = require('node:child_process');

/**
 * Platform-specific npm executable.
 */
const NPM_EXECUTABLE = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * Creates the spawn options shared by every npm command of the Agents Server scripts.
 *
 * Windows resolves npm through a `.cmd` shim, which needs shell execution when spawned from
 * Node.js on some supported Node versions.
 *
 * @param {{ cwd: string, environmentOverrides?: Readonly<Record<string, string>> }} options - Command options.
 * @returns {{ cwd: string, env: Record<string, string|undefined>, shell: boolean }} Shared spawn options.
 */
function createNpmSpawnOptions({ cwd, environmentOverrides = {} }) {
    return {
        cwd,
        env: {
            ...process.env,
            ...environmentOverrides,
        },
        shell: process.platform === 'win32',
    };
}

/**
 * Runs one npm command, waits for it, and forwards its output and exit status.
 *
 * @param {ReadonlyArray<string>} argumentsList - Arguments passed to npm.
 * @param {{ cwd: string, environmentOverrides?: Readonly<Record<string, string>> }} options - Command options.
 */
function runNpm(argumentsList, options) {
    const result = spawnSync(NPM_EXECUTABLE, argumentsList, {
        ...createNpmSpawnOptions(options),
        stdio: 'inherit',
    });

    if (result.error) {
        console.error(`Failed to run ${NPM_EXECUTABLE}:`, result.error);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

/**
 * Starts one npm command without waiting for it and forwards its output to this terminal.
 *
 * @param {ReadonlyArray<string>} argumentsList - Arguments passed to npm.
 * @param {{ cwd: string, environmentOverrides?: Readonly<Record<string, string>> }} options - Command options.
 * @returns {Promise<number>} Exit status of the finished command.
 */
function startNpm(argumentsList, options) {
    return waitForNpm(
        spawn(NPM_EXECUTABLE, argumentsList, {
            ...createNpmSpawnOptions(options),
            stdio: 'inherit',
        }),
    );
}

/**
 * Starts one npm command without waiting for it and collects its output instead of printing it.
 *
 * Two commands running next to each other cannot share this terminal line by line, so the output of
 * the quieter one is kept and printed as one readable block once it has finished.
 *
 * @param {ReadonlyArray<string>} argumentsList - Arguments passed to npm.
 * @param {{ cwd: string, environmentOverrides?: Readonly<Record<string, string>> }} options - Command options.
 * @returns {Promise<{ status: number, output: string }>} Exit status and collected output.
 */
function startNpmWithCollectedOutput(argumentsList, options) {
    const npmProcess = spawn(NPM_EXECUTABLE, argumentsList, {
        ...createNpmSpawnOptions(options),
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    const collectOutput = (chunk) => {
        output = `${output}${chunk.toString()}`;
    };

    npmProcess.stdout?.on('data', collectOutput);
    npmProcess.stderr?.on('data', collectOutput);

    return waitForNpm(npmProcess).then((status) => ({ status, output }));
}

/**
 * Waits for one started npm command and reports its exit status.
 *
 * @param {import('node:child_process').ChildProcess} npmProcess - Started npm command.
 * @returns {Promise<number>} Exit status of the finished command.
 */
function waitForNpm(npmProcess) {
    return new Promise((resolve) => {
        npmProcess.once('error', (error) => {
            console.error(`Failed to run ${NPM_EXECUTABLE}:`, error);
            resolve(1);
        });

        npmProcess.once('close', (status) => {
            resolve(status ?? 1);
        });
    });
}

module.exports = {
    runNpm,
    startNpm,
    startNpmWithCollectedOutput,
};
