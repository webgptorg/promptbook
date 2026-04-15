'use strict';

/**
 * Constant for { spawn }.
 */
const { spawn } = require('node:child_process');
/**
 * Constant for { mkdir, write file }.
 */
const { mkdir, writeFile } = require('node:fs/promises');
/**
 * Constant for path.
 */
const path = require('node:path');

/**
 * Constant for app root.
 */
const APP_ROOT = path.resolve(__dirname, '..');
/**
 * Constant for port.
 */
const PORT = Number.parseInt(process.env.PRE_RENDER_PORT ?? '4440', 10) || 4440;
/**
 * Constant for home URL.
 */
const HOME_URL = `http://127.0.0.1:${PORT}/`;
/**
 * Marker printed by `next start` once the production server accepts requests.
 */
const SERVER_READY_MARKER = 'Ready in';
/**
 * Constant for output dir.
 */
const OUTPUT_DIR = path.join(APP_ROOT, '.next', 'prerendered');
/**
 * Constant for output file.
 */
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'home.html');
/**
 * Constant for wait timeout ms.
 */
const WAIT_TIMEOUT_MS = 15000;
/**
 * Timeout for the final homepage download once the server is confirmed ready.
 */
const HOME_REQUEST_TIMEOUT_MS = 30000;
/**
 * When enabled, homepage prerender failures abort the whole build.
 */
const IS_STRICT_PRERENDER_ENABLED = process.env.PRERENDER_HOMEPAGE_STRICT === 'true';

/**
 * Detects child-process termination errors that can be safely ignored during cleanup.
 *
 * Windows can report `EPERM` when the child is already shutting down, so cleanup must stay best-effort.
 *
 * @param error - Unknown kill failure thrown by Node.
 * @returns Whether the error should be ignored.
 */
function isIgnorableStopServerError(error) {
    return (
        error instanceof Error &&
        'code' in error &&
        (error.code === 'EPERM' || error.code === 'ESRCH')
    );
}

/**
 * Waits for `next start` to report that it is ready to serve requests.
 *
 * HTTP probes are intentionally avoided here because the Agents Server middleware
 * can trigger remote agent lookups even for seemingly lightweight routes.
 *
 * @param serverProcess - Spawned `next start` child process.
 * @returns Promise that resolves once the server reports readiness.
 * @throws When the server exits or does not become ready in time.
 */
function waitForServerReady(serverProcess) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let stdoutBuffer = '';

        const cleanup = () => {
            clearTimeout(timeoutId);
            serverProcess.stdout?.off('data', handleStdout);
            serverProcess.off('error', handleError);
            serverProcess.off('exit', handleExit);
        };

        const settle = (handler, value) => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();
            handler(value);
        };

        const handleStdout = (chunk) => {
            stdoutBuffer = `${stdoutBuffer}${chunk.toString()}`.slice(-4096);
            if (stdoutBuffer.includes(SERVER_READY_MARKER)) {
                settle(resolve);
            }
        };

        const handleError = (error) => {
            settle(reject, error);
        };

        const handleExit = (code, signal) => {
            settle(
                reject,
                new Error(
                    `Production server exited before it became ready (code: ${String(code)}, signal: ${String(signal)})`,
                ),
            );
        };

        const timeoutId = setTimeout(() => {
            settle(
                reject,
                new Error(`Timed out waiting ${WAIT_TIMEOUT_MS}ms for \`next start\` to report readiness.`),
            );
        }, WAIT_TIMEOUT_MS);

        serverProcess.stdout?.on('data', handleStdout);
        serverProcess.on('error', handleError);
        serverProcess.on('exit', handleExit);

        if (stdoutBuffer.includes(SERVER_READY_MARKER)) {
            settle(resolve);
        }
    });
}

/**
 * Runs the production server for the built app, captures `/`, and keeps the HTML.
 */
async function prerenderHomePage() {
    const rootDir = path.resolve(APP_ROOT, '..');
    const nextBinary = require.resolve('next/dist/bin/next', { paths: [rootDir] });
    const serverProcess = spawn(process.execPath, [nextBinary, 'start', '-p', String(PORT)], {
        cwd: APP_ROOT,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    const gracefulExit = new Promise((resolve) => serverProcess.on('exit', resolve));
    serverProcess.stdout?.pipe(process.stdout);
    serverProcess.stderr?.pipe(process.stderr);

    let aborted = false;
    const stopServer = () => {
        if (aborted) {
            return;
        }

        aborted = true;

        if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
            return;
        }

        try {
            serverProcess.kill();
        } catch (error) {
            if (!isIgnorableStopServerError(error)) {
                throw error;
            }
        }
    };

    process.on('SIGINT', stopServer);
    process.on('SIGTERM', stopServer);

    try {
        await waitForServerReady(serverProcess);
        const response = await fetch(HOME_URL, {
            cache: 'no-store',
            signal: AbortSignal.timeout(HOME_REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`Failed to download ${HOME_URL} (${response.status})`);
        }
        const html = await response.text();
        await mkdir(OUTPUT_DIR, { recursive: true });
        await writeFile(OUTPUT_FILE, html, 'utf8');
        console.log(`Prerendered home page and saved to ${OUTPUT_FILE}`);
    } finally {
        stopServer();
        await gracefulExit;
    }
}

prerenderHomePage().catch((error) => {
    if (IS_STRICT_PRERENDER_ENABLED) {
        console.error('Prerender homepage failed:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
        return;
    }

    console.warn(
        'Skipping homepage prerender:',
        error instanceof Error ? error.message : error,
    );
});
