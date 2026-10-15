import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { projectAt } from '../project/workspace.js';
import { recordDiagnostic } from '../engine/traces.js';
import { ServiceHost } from './host.js';
import { readLaunchMetadata, restoreDiscoveryEnvironment, rotateServiceLog } from './records.js';

/**
 * Number of appended event lines between rotation checks.
 */
const ROTATION_CHECK_INTERVAL = 200;

/**
 * Appended lines since the last rotation check.
 */
let appendedLines = 0;

/**
 * Appends to the bounded service event log (rotated to one previous generation).
 */
function appendServiceLog(path: string, line: string): void {
    if (++appendedLines % ROTATION_CHECK_INTERVAL === 0) rotateServiceLog(path);
    try {
        appendFileSync(path, line);
    } catch {
        // Logging must never stop the agenda.
    }
}

/**
 * Daemon worker entry: `node dist/service/worker.js <projectRoot>`.
 *
 * Restores the launching terminal's discovery paths before any Git or harness inspection, hosts the agenda and
 * exits 0 only on a requested stop (a crash exit lets the supervisor restart it).
 */
async function main(): Promise<void> {
    const project = projectAt(process.argv[2] ?? '.');
    const launch = await readLaunchMetadata(project);
    if (!launch) throw new Error(`No launch metadata in ${project.runtime.service}; start the service with \`ptbk start\`.`);
    const env = restoreDiscoveryEnvironment(launch.env, launch.nodePath);
    for (const [key, value] of Object.entries(env)) if (value !== undefined) process.env[key] = value;
    const eventLog = join(project.runtime.logs, 'service.log');
    mkdirSync(project.runtime.logs, { recursive: true });
    const host = new ServiceHost({
        project,
        mode: 'daemon',
        env: process.env,
        cli: launch.cli,
        cliHarnesses: launch.cliHarnesses,
        tasksDirectory: launch.tasksDirectory,
        persistent: launch.persistent,
        persistenceNote: launch.persistent ? undefined : 'Persistence disabled (--no-persist).',
        supervisorPid: process.ppid,
        launchNonce: launch.launchNonce,
        allowTunnelInstall: true,
        onEvent: (text, level) => appendServiceLog(eventLog, `${new Date().toISOString()} ${level.toUpperCase()} ${text}\n`),
    });
    const stop = (): void => {
        host.agenda.requestStop({ cancelCurrent: true });
    };
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
    process.on('SIGHUP', () => undefined);
    await host.start();
    try {
        await host.runAgenda();
    } finally {
        await host.shutdown();
    }
}

main().then(
    () => process.exit(0),
    async (error: unknown) => {
        process.stderr.write(`${new Date().toISOString()} FATAL ${errorMessage(error)}\n${(error as Error)?.stack ?? ''}\n`);
        await recordDiagnostic(projectAt(process.argv[2] ?? '.'), { phase: 'daemon worker', message: errorMessage(error), details: { stack: (error as Error)?.stack } }).catch(() => undefined);
        process.exit(1);
    },
);
