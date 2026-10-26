import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { open, readFile, rm, stat } from 'node:fs/promises';
import { errorMessage, PtbkError } from '../common/errors.js';
import { ensureDirectory } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import { ipcRequest } from '../common/ipc.js';
import { isProcessAlive, killVerifiedProcess, verifyRecordedProcess } from '../common/process.js';
import { ENGINE_ROOT, ENGINE_VERSION, engineModule } from '../common/version.js';
import { clearOperatorIntent } from '../engine/operator-intent.js';
import type { Project } from '../project/workspace.js';
import { lookupService, type ServiceLookup } from './control.js';
import { recordRunEnded } from './known-projects.js';
import { terminateOwnedProcesses } from './owned-processes.js';
import { BrowserPools } from '../browser/pool.js';
import { registerPersistence, unregisterPersistence, type PersistenceOutcome } from './persistence.js';
import { discoveryEnvironment, readLaunchMetadata, readProcessRecord, rotateServiceLog, servicePaths, writeLaunchMetadata, type LaunchMetadata, type ProcessRecord } from './records.js';

/**
 * How long a launch waits for the worker to become controllable.
 */
const LAUNCH_TIMEOUT_MS = 60_000;

/**
 * How long a restarted daemon's replacement may take to become controllable after the old worker ended.
 */
const REPLACEMENT_START_MS = 60_000;

/**
 * A launch lock older than this is stale.
 */
const LAUNCH_LOCK_STALE_MS = 120_000;

/**
 * How long a force-stopped engine may take to end by itself (with its bounded cleanup) before it is killed.
 */
const FORCE_STOP_GRACE_MS = 15_000;

/**
 * Bound of the force-stop request itself: an unresponsive engine is never waited for.
 */
const FORCE_REQUEST_TIMEOUT_MS = 3000;

/**
 * Inputs of a daemon launch.
 *
 * @private daemon launcher
 */
export type LaunchRequest = {
    readonly cli: Readonly<Record<string, unknown>>;
    readonly cliHarnesses?: readonly string[];
    readonly cliBrowser?: LaunchMetadata['cliBrowser'];
    readonly tasksDirectory?: string;
    readonly persistent: boolean;
    readonly env: NodeJS.ProcessEnv;
};

/**
 * Result of launching (or finding) the daemon.
 *
 * @private daemon launcher
 */
export type LaunchResult = { readonly started: boolean; readonly lookup: Extract<ServiceLookup, { state: 'running' }>; readonly persistence?: PersistenceOutcome };

/**
 * Prevents concurrent starts from creating duplicate workers.
 */
async function withLaunchLock<T>(project: Project, action: () => Promise<T>): Promise<T> {
    const path = servicePaths(project).launchLock;
    await ensureDirectory(project.runtime.service);
    for (let attempt = 0; attempt < 120; attempt++) {
        try {
            const handle = await open(path, 'wx');
            await handle.writeFile(JSON.stringify({ pid: process.pid, at: Date.now() }));
            await handle.close();
            try {
                return await action();
            } finally {
                await rm(path, { force: true });
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            try {
                const holder = JSON.parse(await readFile(path, 'utf8')) as { pid?: number; at?: number };
                const age = Date.now() - (holder.at ?? (await stat(path)).mtimeMs);
                if (!isProcessAlive(holder.pid) || age > LAUNCH_LOCK_STALE_MS) await rm(path, { force: true });
            } catch {
                await rm(path, { force: true });
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }
    throw new PtbkError('Another `ptbk start` is in progress for this project.', { kind: 'conflict', project: project.root, next: ['Wait for it to finish, then run `ptbk status`.'] });
}

/**
 * Reads the tail of a log file for diagnostics.
 */
async function tail(path: string, characters = 3000): Promise<string> {
    try {
        const text = await readFile(path, 'utf8');
        return text.slice(-characters).trim();
    } catch {
        return '';
    }
}

/**
 * Starts the detached daemon (supervisor + worker) or reports the existing one without replacing it.
 *
 * @private daemon launcher
 */
export async function launchDaemon(project: Project, request: LaunchRequest): Promise<LaunchResult> {
    return await withLaunchLock(project, async () => {
        const existing = await lookupService(project);
        if (existing.state === 'running') return { started: false, lookup: existing };
        if (existing.state === 'unreachable') {
            throw new PtbkError('A ptbk process is recorded for this project but does not answer.', {
                kind: 'conflict',
                project: project.root,
                reason: `PID ${existing.record.pid}: ${existing.reason}`,
                effect: 'No second worker was started.',
                next: ['Wait a moment and run `ptbk status`; if it stays unreachable, stop that process and retry.'],
            });
        }
        const nonce = shortId(10);
        const metadata: LaunchMetadata = {
            version: 1,
            projectRoot: project.root,
            nodePath: process.execPath,
            installation: ENGINE_ROOT,
            engineVersion: ENGINE_VERSION,
            cli: request.cli,
            cliHarnesses: request.cliHarnesses,
            cliBrowser: request.cliBrowser,
            tasksDirectory: request.tasksDirectory,
            env: discoveryEnvironment(request.env),
            persistent: request.persistent,
            intentionallyStopped: false,
            launchNonce: nonce,
            savedAt: new Date().toISOString(),
        };
        await writeLaunchMetadata(project, metadata);
        rotateServiceLog(servicePaths(project).supervisorLog);
        const log = openSync(servicePaths(project).supervisorLog, 'a');
        const child = spawn(process.execPath, [engineModule('service/supervisor.js'), project.root], { cwd: project.root, detached: true, stdio: ['ignore', log, log], windowsHide: true, env: request.env });
        child.unref();
        const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
        while (Date.now() < deadline) {
            const record = await readProcessRecord(project);
            if (record?.launchNonce === nonce) {
                const lookup = await lookupService(project);
                if (lookup.state === 'running') {
                    const persistence = request.persistent ? await registerPersistence(project, process.execPath, metadata.env.PATH ?? metadata.env.Path ?? '') : undefined;
                    if (!request.persistent) await unregisterPersistence(project);
                    return { started: true, lookup, persistence };
                }
            }
            if (child.exitCode !== null && !isProcessAlive(child.pid)) break;
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        const workerLog = await tail(servicePaths(project).workerLog);
        const supervisorLog = await tail(servicePaths(project).supervisorLog, 1000);
        throw new PtbkError('The background service did not start.', {
            kind: 'technical',
            phase: 'daemon startup',
            project: project.root,
            reason: (workerLog.split('\n').reverse().find((line) => /FATAL|Error/.test(line)) ?? workerLog.split('\n').slice(-3).join(' ')) || supervisorLog || 'No output was produced.',
            trace: servicePaths(project).workerLog,
            next: ['Read the worker log above, fix the cause, and run `ptbk start` again (or `ptbk start --foreground` to see it directly).'],
        });
    });
}

/**
 * Outcome of a one-shot stop request: completed only after the verified owner ended and released the project.
 *
 * @private daemon launcher
 */
export type StopResult = {
    readonly wasRunning: boolean;
    readonly record?: ProcessRecord;
    /** The owner ended (confirmed by its process and record, not merely a lost endpoint). */
    readonly stopped: boolean;
    /** The engine's acknowledgement (e.g. `stopping` while the current task drains). */
    readonly accepted?: { readonly state?: string; readonly outcome: string };
    readonly message: string;
    /** Force stop could not be confirmed (an owner whose identity could not be verified is never killed). */
    readonly unconfirmed?: boolean;
    /** Problems the result must not hide (startup suppression, owned processes that could not be verified). */
    readonly warnings?: readonly string[];
};

/**
 * Requests the shared engine stop operation of the project's service (any placement) and waits, bounded, for the
 * owner to end: graceful by default (the current task settles first), or an immediate force stop of owned work.
 *
 * An intentional completed stop is recorded by the engine itself, so cancelling a pending stop leaves no
 * permanent-stop setting behind. A lost reply is reported as unconfirmed and never replayed.
 *
 * @private daemon launcher
 */
export async function stopService(project: Project, options: { readonly force: boolean; readonly timeoutMs?: number }): Promise<StopResult> {
    if (options.force) {
        const result = await forceStopEngine(project, { graceMs: options.timeoutMs });
        return {
            wasRunning: result.status !== 'not-running',
            record: result.record,
            stopped: result.status === 'terminated' || result.status === 'not-running',
            unconfirmed: result.status === 'unconfirmed' || result.status === 'failed',
            message: result.message,
            warnings: result.warnings,
        };
    }
    const lookup = await lookupService(project);
    if (lookup.state === 'stopped') {
        await markIntentionalStop(project);
        return { wasRunning: false, stopped: true, message: lookup.stale ? 'The service was not running (a stale record was found and ignored).' : 'The service was not running.' };
    }
    if (lookup.state === 'unreachable') {
        throw new PtbkError('The recorded ptbk process does not answer, so it was not stopped.', {
            kind: 'conflict',
            project: project.root,
            reason: `PID ${lookup.record.pid}: ${lookup.reason}`,
            effect: 'No process was terminated (it may not be a ptbk service).',
            next: ['Run `ptbk status` again; if the process is a stuck ptbk worker, terminate that PID manually.'],
        });
    }
    const accepted = await lookup.client.request<{ state?: string; outcome: string }>('stop');
    const deadline = Date.now() + (options.timeoutMs ?? 120_000);
    while (Date.now() < deadline) {
        const record = await readProcessRecord(project);
        if ((!record || record.instanceId !== lookup.record.instanceId) && !isProcessAlive(lookup.record.pid)) {
            return { wasRunning: true, record: lookup.record, stopped: true, accepted, message: 'Stopped.' };
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return { wasRunning: true, record: lookup.record, stopped: false, accepted, message: `Stop accepted (${accepted.state ?? 'stopping'}), but the service is still finishing its current work.` };
}

/**
 * Outcome of a restart request.
 *
 * @private daemon launcher
 */
export type RestartResult =
    | { readonly kind: 'restarted'; readonly previous: ProcessRecord; readonly lookup: Extract<ServiceLookup, { state: 'running' }> }
    | { readonly kind: 'pending'; readonly previous: ProcessRecord; readonly message: string }
    | { readonly kind: 'unsupported'; readonly previous: ProcessRecord };

/**
 * Restarts the project's running engine through its shared lifecycle: it drains like a graceful stop (with visible
 * restart intent), releases ownership and exactly one replacement starts with the same project, saved launch
 * configuration and installation (a daemon's supervisor or the owning foreground invocation). Changed launch overrides
 * of a daemon are saved first; an engine without the restart operation reports `unsupported`.
 *
 * @private daemon launcher
 */
export async function restartService(
    project: Project,
    lookup: Extract<ServiceLookup, { state: 'running' }>,
    options: { readonly launch?: Partial<Pick<LaunchMetadata, 'cli' | 'cliHarnesses' | 'cliBrowser' | 'tasksDirectory' | 'persistent'>>; readonly timeoutMs?: number },
): Promise<RestartResult> {
    const previous = lookup.record;
    if (previous.mode === 'run') throw new PtbkError('A finite run cannot be restarted.', { kind: 'usage', project: project.root, next: ['Wait for it to finish (or stop it), then run it again.'] });
    if (options.launch && previous.mode === 'daemon') {
        const launch = await readLaunchMetadata(project);
        if (launch) await writeLaunchMetadata(project, { ...launch, ...options.launch, intentionallyStopped: false, savedAt: new Date().toISOString() });
    }
    try {
        await lookup.client.request('restart');
    } catch (error) {
        if (error instanceof PtbkError && error.details.kind === 'usage' && /Unknown control method/.test(error.message)) return { kind: 'unsupported', previous };
        throw error;
    }
    const deadline = Date.now() + (options.timeoutMs ?? 180_000);
    let previousEndedAt: number | undefined;
    while (Date.now() < deadline) {
        const record = await readProcessRecord(project);
        if (record && record.instanceId !== previous.instanceId) {
            const fresh = await lookupService(project);
            if (fresh.state === 'running' && fresh.record.instanceId !== previous.instanceId) return { kind: 'restarted', previous, lookup: fresh };
        }
        if (!isProcessAlive(previous.pid)) previousEndedAt ??= Date.now();
        // The old owner ended without a working replacement: report the failed start, never a running service.
        const supervisorGone = !previous.supervisorPid || !isProcessAlive(previous.supervisorPid);
        if (previous.mode === 'daemon' && previousEndedAt !== undefined && !record && (supervisorGone || Date.now() - previousEndedAt > REPLACEMENT_START_MS)) {
            const workerLog = await tail(servicePaths(project).workerLog);
            throw new PtbkError('The service stopped, but its replacement did not start.', {
                kind: 'technical',
                project: project.root,
                reason: workerLog.split('\n').slice(-3).join(' ') || 'No output was produced.',
                trace: servicePaths(project).workerLog,
                next: ['Fix the cause shown in the worker log, then run `ptbk start`.'],
            });
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return { kind: 'pending', previous, message: 'Restart accepted; the service is still finishing its current work before the replacement starts.' };
}

/**
 * Identity of an engine owner to force-stop: its process record, or a discovery entry (no control token) when the
 * record is gone.
 *
 * @private daemon launcher
 */
export type EngineOwner = Pick<ProcessRecord, 'instanceId' | 'pid' | 'supervisorPid' | 'startedAt' | 'controlAddress' | 'mode'> & { readonly token?: string };

/**
 * Outcome of the shared force stop of one engine.
 *
 * @private daemon launcher
 */
export type ForceStopResult = {
    /** `terminated`: the owner ended; `not-running`: nothing to stop; `unconfirmed`: its identity could not be verified, so it was not killed; `failed`: it survived termination. */
    readonly status: 'terminated' | 'not-running' | 'unconfirmed' | 'failed';
    readonly record?: ProcessRecord;
    readonly owner?: EngineOwner;
    /** The owner had to be killed (no cleanup guarantee), rather than ending through its own force stop. */
    readonly killed: boolean;
    readonly message: string;
    readonly warnings: readonly string[];
};

/**
 * Waits (bounded) until a condition holds.
 */
async function waitUntil(condition: () => boolean, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (!condition() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 150));
    return condition();
}

/**
 * The shared whole-engine force stop (`ptbk stop --force`, global Force stop, `ptbk panic`): immediately ends the
 * selected engine and every execution process it owns, without waiting for work to finish.
 *
 * The deliberate stop is recorded first, so neither a supervisor, a pending restart replacement, startup registration
 * nor a reboot undoes it. The engine is asked to force-stop itself (bounded request; its own cleanup releases its
 * records and lock); an engine that does not answer, or does not end within the grace, is killed after its PID is
 * verified against the recorded start, then its supervisor, the recorded owned processes (harnesses, helpers, browser)
 * and a replacement already started by that supervisor. Unrelated processes, other projects and a successor's lock are never touched; an owner that cannot be verified is reported, not killed. Interrupted work keeps its
 * recovery record. No project file is committed.
 *
 * @private daemon launcher
 */
export async function forceStopEngine(project: Project, options: { readonly expected?: EngineOwner; readonly graceMs?: number } = {}, depth = 0): Promise<ForceStopResult> {
    const warnings: string[] = [];
    const record = await readProcessRecord(project);
    const expected = options.expected;
    if (expected && record && record.instanceId !== expected.instanceId && isProcessAlive(record.pid) && isProcessAlive(expected.pid)) {
        return { status: 'failed', record, owner: expected, killed: false, warnings, message: `The project is now owned by another engine instance (PID ${record.pid}); nothing was terminated.` };
    }
    const owner: EngineOwner | undefined = expected && record?.instanceId !== expected.instanceId ? expected : record;
    const suppress = async (): Promise<void> => {
        await markIntentionalStop(project).catch((error: unknown) => warnings.push(`Automatic startup could not be disabled: ${errorMessage(error)}. Run \`ptbk stop --force\` again, or remove the startup registration manually.`));
    };
    const endOwned = async (instanceId: string): Promise<void> => {
        const owned = await terminateOwnedProcesses(project, instanceId);
        if (owned.unverified.length) warnings.push(`${owned.unverified.length} owned process(es) could not be verified and were not terminated: ${owned.unverified.map((item) => `${item.label} (PID ${item.pid})`).join(', ')}.`);
        if (owned.remaining.length) warnings.push(`${owned.remaining.length} owned process(es) did not end: ${owned.remaining.map((item) => `${item.label} (PID ${item.pid})`).join(', ')}.`);
    };
    if (!owner || !isProcessAlive(owner.pid)) {
        // Nothing runs, but the request is still a deliberate stop, and a crashed engine's owned workers end too.
        await suppress();
        if (owner) await endOwned(owner.instanceId);
        await new BrowserPools().reconcile().catch(() => undefined);
        return { status: 'not-running', record, owner, killed: false, warnings, message: record ? 'The engine was not running (a stale record was found and ignored).' : 'The engine was not running.' };
    }
    await suppress();
    let accepted = false;
    if (owner.token) {
        for (const method of ['force-stop', 'stop-now']) {
            try {
                await ipcRequest(owner.controlAddress, { token: owner.token, method, params: {} }, FORCE_REQUEST_TIMEOUT_MS);
                accepted = true;
                break;
            } catch (error) {
                // Engines that predate the shared lifecycle know only `stop-now`; anything else means no answer.
                if (!/Unknown control method/.test(errorMessage(error))) break;
            }
        }
    }
    let killed = false;
    /** The recorded PID now belongs to a process started later: the engine itself ended earlier. */
    let reused = false;
    if (!(await waitUntil(() => !isProcessAlive(owner.pid), accepted ? (options.graceMs ?? FORCE_STOP_GRACE_MS) : 0))) {
        const identity = await verifyRecordedProcess(owner.pid, owner.startedAt);
        reused = identity === 'reused';
        if (identity === 'unknown') {
            return { status: 'unconfirmed', record, owner, killed, warnings, message: `PID ${owner.pid} could not be verified as this project's engine (its start time is unavailable), so it was not killed.` };
        }
        if (identity === 'verified') {
            await killVerifiedProcess(owner.pid);
            killed = true;
            await waitUntil(() => !isProcessAlive(owner.pid), 5000);
        }
    }
    // The supervisor exits by itself once it sees the deliberate stop; a stuck one is ended after verification.
    if (owner.supervisorPid && isProcessAlive(owner.supervisorPid) && !(await waitUntil(() => !isProcessAlive(owner.supervisorPid), 3000))) {
        if ((await verifyRecordedProcess(owner.supervisorPid, owner.startedAt)) === 'verified') await killVerifiedProcess(owner.supervisorPid);
    }
    await endOwned(owner.instanceId);
    // Its shared browsers: the ended engine's connections are dropped; a browser no running engine uses closes.
    await new BrowserPools().reconcile().catch((error: unknown) => warnings.push(`Shared browsers could not be reconciled: ${errorMessage(error)}.`));
    // A replacement that a pending restart's supervisor already launched belongs to the stopped engine, not a successor.
    const after = await readProcessRecord(project);
    if (depth === 0 && after && after.instanceId !== owner.instanceId && owner.supervisorPid && after.supervisorPid === owner.supervisorPid && isProcessAlive(after.pid)) {
        const replacement = await forceStopEngine(project, { expected: after, graceMs: options.graceMs }, depth + 1);
        warnings.push(...replacement.warnings);
        if (replacement.status !== 'terminated' && replacement.status !== 'not-running') warnings.push(`Its pending replacement (PID ${after.pid}): ${replacement.message}`);
    }
    if (reused) return { status: 'not-running', record, owner, killed, warnings, message: `The engine had already ended (PID ${owner.pid} now belongs to an unrelated process, which was not touched).` };
    if (isProcessAlive(owner.pid)) return { status: 'failed', record, owner, killed, warnings, message: `PID ${owner.pid} is still running after termination was attempted.` };
    // A killed engine could not record its own end; the project stays known as stopped.
    if (killed) await recordRunEnded(project, owner.instanceId, 'force-stopped').catch(() => undefined);
    return { status: 'terminated', record, owner, killed, warnings, message: killed ? 'Force-stopped (the engine did not end by itself and was terminated; its cleanup is not guaranteed).' : 'Force-stopped.' };
}

/**
 * Records an intentional stop (graceful, force stop or panic): no automatic startup, supervisor respawn or pending
 * replacement until the next authorized start (launch metadata flag and startup registration). A deliberate stop
 * replaces the manual pause, so the next explicit start runs again.
 *
 * @private daemon launcher
 */
export async function markIntentionalStop(project: Project): Promise<void> {
    const launch = await readLaunchMetadata(project);
    if (launch) await writeLaunchMetadata(project, { ...launch, intentionallyStopped: true, savedAt: new Date().toISOString() });
    clearOperatorIntent(project);
    await unregisterPersistence(project);
}
