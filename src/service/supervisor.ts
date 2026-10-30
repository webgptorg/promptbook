import { spawn, type ChildProcess } from 'node:child_process';
import { openSync } from 'node:fs';
import { engineModule } from '../common/version.js';
import { restoreFailedUpdateLaunch } from '../engine/engine-update.js';
import { installPausedStart } from '../engine/operator-intent.js';
import { projectAt } from '../project/workspace.js';
import { readLaunchMetadata, restoreDiscoveryEnvironment, RESTART_EXIT_CODE, rotateServiceLog, servicePaths } from './records.js';

/**
 * Daemon supervisor entry: `node dist/service/supervisor.js <projectRoot>`.
 *
 * Runs detached from the launching terminal and restarts the worker after an unexpected exit (with backoff) while
 * persistence is enabled and no intentional stop was recorded. An unexpected exit cannot be told apart reliably from an
 * intentional termination, so the replacement only restores availability: it starts paused and never resumes work by
 * itself. A worker that exits after an engine update restart, before it served the project, is part of that update:
 * the previous version is restored and started again with the latest manual intent.
 */

/**
 * Selected project.
 */
const project = projectAt(process.argv[2] ?? '.');

/**
 * Longest restart backoff.
 */
const MAX_BACKOFF_MS = 5 * 60_000;

/**
 * A worker that ran this long resets the backoff.
 */
const HEALTHY_RUN_MS = 10 * 60_000;

/**
 * Currently running worker.
 */
let worker: ChildProcess | undefined;

/**
 * A stop was requested from the operating system.
 */
let terminating = false;

/**
 * Starts one worker with output appended to the worker log.
 */
function startWorker(): ChildProcess {
    rotateServiceLog(servicePaths(project).workerLog);
    const log = openSync(servicePaths(project).workerLog, 'a');
    return spawn(process.execPath, [engineModule('service/worker.js'), project.root], { cwd: project.root, stdio: ['ignore', log, log], windowsHide: true });
}

/**
 * Supervises workers until a clean exit or a disabled restart.
 */
async function supervise(): Promise<void> {
    let backoff = 1000;
    for (;;) {
        const started = Date.now();
        worker = startWorker();
        const code = await new Promise<number | null>((resolve) => worker!.once('exit', (exitCode) => resolve(exitCode)));
        worker = undefined;
        if (terminating || code === 0) return;
        if (code === RESTART_EXIT_CODE) {
            // A requested restart: the old worker released ownership; start exactly one replacement now, unless a
            // deliberate stop (force stop, panic) arrived meanwhile and cancelled the pending replacement.
            if ((await readLaunchMetadata(project))?.intentionallyStopped) return;
            process.stdout.write(`${new Date().toISOString()} worker restarted on request\n`);
            backoff = 1000;
            continue;
        }
        // The engine's own update restart loaded a version that could not start: restore the previous one (once).
        const launch = await readLaunchMetadata(project);
        const update = await restoreFailedUpdateLaunch(project, code, launch ? restoreDiscoveryEnvironment(launch.env, launch.nodePath) : process.env).catch((error: unknown) => ({ restored: false, detail: String((error as Error)?.message ?? error) }));
        if (update) process.stdout.write(`${new Date().toISOString()} engine update: ${update.detail}\n`);
        if (update?.restored) {
            if (terminating || (await readLaunchMetadata(project))?.intentionallyStopped) return;
            continue;
        }
        if (!launch?.persistent || launch.intentionallyStopped) return;
        if (Date.now() - started > HEALTHY_RUN_MS) backoff = 1000;
        process.stdout.write(`${new Date().toISOString()} worker exited with ${String(code)}; restarting paused in ${Math.round(backoff / 1000)}s\n`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        // A deliberate stop recorded during the backoff (e.g. `ptbk panic` of the crashed worker) is never undone.
        const current = await readLaunchMetadata(project);
        if (terminating || !current?.persistent || current.intentionallyStopped) return;
        try {
            installPausedStart(project, 'unexpected-loss');
        } catch (error) {
            // Never restore an unpaused engine after an unexpected exit.
            process.stderr.write(`${new Date().toISOString()} the paused restart could not be prepared (${String((error as Error)?.message ?? error)}); not restarting\n`);
            return;
        }
    }
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        terminating = true;
        worker?.kill(signal);
    });
}
process.on('SIGHUP', () => undefined);

supervise().then(
    () => process.exit(0),
    (error: unknown) => {
        process.stderr.write(`${new Date().toISOString()} supervisor failed: ${String((error as Error)?.stack ?? error)}\n`);
        process.exit(1);
    },
);
