'use strict';

const { spawnSync } = require('node:child_process');

/**
 * Frees the given TCP ports before a build, a development server, or an E2E run binds them again.
 *
 * This replaces `npx kill-port`, which resolved an undeclared package through the npm registry on
 * every single invocation. Freeing a port is a best-effort cleanup step, so nothing here may ever
 * fail the surrounding command.
 *
 * Usage: `node ./scripts/kill-port.js 4021 4440`
 */
function killPorts() {
    for (const port of parsePortArguments(process.argv.slice(2))) {
        const listeningProcessIds = resolveListeningProcessIds(port);

        if (listeningProcessIds.length === 0) {
            console.log(`No process is listening on port ${port}.`);
            continue;
        }

        for (const processId of listeningProcessIds) {
            if (killProcess(processId)) {
                console.log(`Freed port ${port} by stopping process ${processId}.`);
            } else {
                console.log(`Could not stop process ${processId} listening on port ${port}.`);
            }
        }
    }
}

/**
 * Reads the TCP ports from the command line arguments.
 *
 * @param {ReadonlyArray<string>} argumentsList - Raw command line arguments.
 * @returns {Array<number>} Valid TCP ports.
 */
function parsePortArguments(argumentsList) {
    return argumentsList.map((argument) => Number(argument)).filter(isPort);
}

/**
 * Returns whether one value is a usable TCP port number.
 *
 * @param {number} value - Parsed command line argument.
 * @returns {boolean} Whether the value can be freed.
 */
function isPort(value) {
    return Number.isInteger(value) && value > 0 && value <= 65535;
}

/**
 * Resolves the process ids currently listening on one TCP port.
 *
 * @param {number} port - TCP port to inspect.
 * @returns {Array<number>} Process ids of the listeners.
 */
function resolveListeningProcessIds(port) {
    if (process.platform === 'win32') {
        return resolveWindowsListeningProcessIds(port);
    }

    return resolvePosixListeningProcessIds(port);
}

/**
 * Resolves listeners of one TCP port through the Windows `netstat` utility.
 *
 * @param {number} port - TCP port to inspect.
 * @returns {Array<number>} Process ids of the listeners.
 */
function resolveWindowsListeningProcessIds(port) {
    const netstatResult = spawnSync('netstat', ['-a', '-n', '-o', '-p', 'TCP'], { encoding: 'utf8' });

    if (typeof netstatResult.stdout !== 'string') {
        return [];
    }

    return dedupeProcessIds(
        netstatResult.stdout
            .split(/\r?\n/u)
            .filter((line) => line.includes('LISTENING'))
            .map((line) => line.trim().split(/\s+/u))
            .filter((columns) => columns.length >= 5 && isAddressOnPort(columns[1], port))
            .map((columns) => Number(columns[columns.length - 1])),
    );
}

/**
 * Resolves listeners of one TCP port through the POSIX `lsof` utility.
 *
 * @param {number} port - TCP port to inspect.
 * @returns {Array<number>} Process ids of the listeners.
 */
function resolvePosixListeningProcessIds(port) {
    const listOpenFilesResult = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
        encoding: 'utf8',
    });

    if (typeof listOpenFilesResult.stdout !== 'string') {
        return [];
    }

    return dedupeProcessIds(listOpenFilesResult.stdout.split(/\s+/u).map((value) => Number(value)));
}

/**
 * Returns whether one `netstat` local address belongs to the inspected port.
 *
 * The address is printed as `0.0.0.0:4440`, `127.0.0.1:4440`, or `[::]:4440`.
 *
 * @param {string} address - Local address column of one `netstat` row.
 * @param {number} port - TCP port to inspect.
 * @returns {boolean} Whether the row belongs to the port.
 */
function isAddressOnPort(address, port) {
    return address.endsWith(`:${port}`);
}

/**
 * Keeps only distinct process ids which are safe to stop.
 *
 * The current process and its parent are excluded so that freeing a port can never stop the build,
 * the test runner, or the shell which started them.
 *
 * @param {ReadonlyArray<number>} processIds - Raw process ids.
 * @returns {Array<number>} Distinct stoppable process ids.
 */
function dedupeProcessIds(processIds) {
    return Array.from(
        new Set(
            processIds.filter(
                (processId) =>
                    Number.isInteger(processId) &&
                    processId > 0 &&
                    processId !== process.pid &&
                    processId !== process.ppid,
            ),
        ),
    );
}

/**
 * Stops one process which holds an inspected port.
 *
 * @param {number} processId - Process id of the listener.
 * @returns {boolean} Whether the process was stopped.
 */
function killProcess(processId) {
    if (process.platform === 'win32') {
        return spawnSync('taskkill', ['/F', '/PID', String(processId)], { stdio: 'ignore' }).status === 0;
    }

    try {
        process.kill(processId, 'SIGKILL');
        return true;
    } catch {
        return false;
    }
}

killPorts();
