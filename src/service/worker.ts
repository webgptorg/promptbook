import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { projectAt } from '../project/workspace.js';
import { recordDiagnostic } from '../engine/traces.js';
import { ServiceHost } from './host.js';
import { markIntentionalStop } from './launcher.js';
import { readLaunchMetadata, restoreDiscoveryEnvironment, RESTART_EXIT_CODE, rotateServiceLog } from './records.js';

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
 * exits 0 only on a requested stop (a crash exit lets the supervisor restart it; a restart request exits with
 * {@link RESTART_EXIT_CODE} after releasing ownership so the supervisor starts one replacement).
 */
async function main(): Promise<number> {
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
        cliBrowser: launch.cliBrowser,
        tasksDirectory: launch.tasksDirectory,
        persistent: launch.persistent,
        persistenceNote: launch.persistent ? undefined : 'Persistence disabled (--no-persist).',
        supervisorPid: process.ppid,
        launchNonce: launch.launchNonce,
        allowTunnelInstall: true,
        onEvent: (text, level) => appendServiceLog(eventLog, `${new Date().toISOString()} ${level.toUpperCase()} ${text}\n`),
    });
    // A catchable OS termination request drains gracefully (the host may still kill the process after its own grace period).
    const stop = (): void => {
        host.agenda.requestStop({ signal: true });
    };
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
    process.on('SIGHUP', () => undefined);
    await host.start();
    let outcome: string;
    try {
        outcome = (await host.runAgenda()).outcome;
    } finally {
        await host.shutdown();
    }
    // An intentional user stop suppresses automatic startup until the next authorized start; restart and OS
    // termination do not.
    if (host.agenda.intentionalStop) await markIntentionalStop(project).catch(() => undefined);
    return outcome === 'restart' ? RESTART_EXIT_CODE : 0;
}

main().then(
    (code) => process.exit(code),
    async (error: unknown) => {
        process.stderr.write(`${new Date().toISOString()} FATAL ${errorMessage(error)}\n${(error as Error)?.stack ?? ''}\n`);
        await recordDiagnostic(projectAt(process.argv[2] ?? '.'), { phase: 'daemon worker', message: errorMessage(error), details: { stack: (error as Error)?.stack } }).catch(() => undefined);
        process.exit(1);
    },
);
