'use strict';

const { spawnSync } = require('node:child_process');

/**
 * Platform-specific npm executable.
 */
const NPM_EXECUTABLE = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * Runs one npm command and forwards its output and exit status.
 *
 * Windows resolves npm through a `.cmd` shim, which needs shell execution when spawned from
 * Node.js on some supported Node versions.
 *
 * @param {ReadonlyArray<string>} argumentsList - Arguments passed to npm.
 * @param {{ cwd: string, environmentOverrides?: Readonly<Record<string, string>> }} options - Command options.
 */
function runNpm(argumentsList, { cwd, environmentOverrides = {} }) {
    const result = spawnSync(NPM_EXECUTABLE, argumentsList, {
        cwd,
        env: {
            ...process.env,
            ...environmentOverrides,
        },
        shell: process.platform === 'win32',
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

module.exports = {
    runNpm,
};
