'use strict';

const { spawn } = require('node:child_process');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const APP_ROOT = path.resolve(__dirname, '..');
const PORT = Number.parseInt(process.env.PRE_RENDER_PORT ?? '4440', 10) || 4440;
const HOME_URL = `http://127.0.0.1:${PORT}/`;
const OUTPUT_DIR = path.join(APP_ROOT, '.next', 'prerendered');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'home.html');
const WAIT_INTERVAL_MS = 500;
const WAIT_TIMEOUT_MS = 15000;
let spawnError = null;

/**
 * Sleeps for the requested amount of time.
 *
 * @param ms - Milliseconds to wait.
 * @returns Promise that resolves after the delay.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for the production server to respond on the home page.
 *
 * @throws When the server did not start within the timeout window.
 */
async function waitForServer() {
    const deadline = Date.now() + WAIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
        if (spawnError) {
            throw spawnError;
        }
        try {
            const response = await fetch(HOME_URL, { method: 'HEAD', cache: 'no-store' });
            if (response.ok) {
                return;
            }
        } catch (error) {
            // Roll through the polling cycle until the server accepts a connection.
        }
        await sleep(WAIT_INTERVAL_MS);
    }
    throw new Error(`Unable to reach ${HOME_URL} within ${WAIT_TIMEOUT_MS}ms`);
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
        if (!aborted) {
            aborted = true;
            serverProcess.kill();
        }
    };

    serverProcess.on('error', (error) => {
        spawnError = error;
        stopServer();
    });

    process.on('SIGINT', stopServer);
    process.on('SIGTERM', stopServer);

    try {
        await waitForServer();
        const response = await fetch(HOME_URL, { cache: 'no-store' });
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
    console.error('Prerender homepage failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
