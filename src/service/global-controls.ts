import { join } from 'node:path';
import { errorMessage, PtbkError } from '../common/errors.js';
import { isDirectory, pathExists } from '../common/fs.js';
import { runProcess } from '../common/process.js';
import { ENGINE_ROOT } from '../common/version.js';
import type { LifecycleOutcome } from '../engine/agenda.js';
import { projectAt } from '../project/workspace.js';
import { lookupService, type ControlClient } from './control.js';
import { readRegistry, verifyEngine, type DiscoveryEntry } from './discovery.js';
import { forgetKnownProject, restoreKnownProject, type KnownProject } from './known-projects.js';
import { forceStopEngine } from './launcher.js';
import { readLaunchMetadata, restoreDiscoveryEnvironment } from './records.js';

/**
 * One lifecycle or registry action of the global dashboard, applied to one known project.
 *
 * @private global controls
 */
export type GlobalAction = 'start' | 'stop' | 'force-stop' | 'pause' | 'resume' | 'remove';

/**
 * Per-project outcome of a global action: `completed`, `accepted` (pending: e.g. draining), `unchanged` (already in the
 * requested state), `needs-confirmation` (a conflicting pending intent), `not-applicable`, `unconfirmed` or `failed`.
 *
 * @private global controls
 */
export type ProjectActionOutcome = {
    readonly projectRoot: string;
    readonly projectName: string;
    readonly action: GlobalAction;
    readonly status: 'completed' | 'accepted' | 'unchanged' | 'needs-confirmation' | 'not-applicable' | 'unconfirmed' | 'failed';
    readonly message: string;
};

/**
 * Target of a global action (one row of the global table).
 *
 * @private global controls
 */
export type GlobalTarget = {
    readonly projectRoot: string;
    readonly projectName: string;
    /** Durable registration (launch context of an explicit Start). */
    readonly known?: KnownProject;
    /** Verified live owner, when any. */
    readonly engine?: Pick<DiscoveryEntry, 'instanceId' | 'pid' | 'supervisorPid' | 'startedAt' | 'controlAddress' | 'mode'>;
    readonly client?: ControlClient;
};

/**
 * How long one explicit Start may take (the ordinary launcher waits for the daemon itself).
 */
const START_TIMEOUT_MS = 180_000;

/**
 * Builds an outcome.
 */
function outcome(target: GlobalTarget, action: GlobalAction, status: ProjectActionOutcome['status'], message: string): ProjectActionOutcome {
    return { projectRoot: target.projectRoot, projectName: target.projectName, action, status, message };
}

/**
 * The headline of a failed command: its raw `Error:` line (with the first `Next:` step), else its last output line.
 */
function failureSummary(stderr: string, stdout: string): string {
    const lines = `${stderr}\n${stdout}`
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const error = lines.find((line) => line.startsWith('Error: '));
    const next = lines[lines.indexOf('Next:') + 1]?.replace(/^- /, '');
    if (error) return `${error.slice('Error: '.length)}${lines.includes('Next:') && next ? ` Next: ${next}` : ''}`;
    return lines.pop() ?? '';
}

/**
 * Explicit Start of a stopped known project through the ordinary launcher (`ptbk start`) of its recorded installation,
 * with its saved launch overrides. A live engine is left unchanged (Start is not Resume); a missing directory or
 * installation is diagnosed, never replaced by another one.
 *
 * @private global controls
 */
export async function startKnownProject(target: GlobalTarget, env: NodeJS.ProcessEnv = process.env): Promise<ProjectActionOutcome> {
    if (!(await isDirectory(target.projectRoot))) return outcome(target, 'start', 'failed', `The project directory ${target.projectRoot} no longer exists; nothing was started.`);
    const project = projectAt(target.projectRoot);
    const lookup = await lookupService(project);
    if (lookup.state === 'running') return outcome(target, 'start', 'unchanged', `Already running (PID ${lookup.record.pid}); its state was not changed.`);
    if (lookup.state === 'unreachable') return outcome(target, 'start', 'failed', `A recorded engine (PID ${lookup.record.pid}) does not answer: ${lookup.reason}. Nothing was started.`);
    const launch = await readLaunchMetadata(project);
    const installation = launch?.installation ?? target.known?.installation ?? ENGINE_ROOT;
    const bin = join(installation, 'bin', 'ptbk.js');
    if (!(await pathExists(bin))) return outcome(target, 'start', 'failed', `Its installation ${installation} no longer exists; nothing was started. Run \`ptbk start --path "${target.projectRoot}"\` with the installation you want.`);
    const recordedNode = launch?.nodePath ?? target.known?.nodePath;
    const nodePath = recordedNode && (await pathExists(recordedNode)) ? recordedNode : process.execPath;
    const childEnv = launch ? restoreDiscoveryEnvironment(launch.env, nodePath, env) : env;
    const base = [bin, 'start', '--path', target.projectRoot, '--no-dashboard', '--non-interactive', '--raw'];
    let result = await runProcess(nodePath, [...base, ...(launch ? ['--saved-launch'] : [])], { cwd: target.projectRoot, env: childEnv, timeoutMs: START_TIMEOUT_MS });
    // An installation of an older version does not know the saved-launch start yet: its ordinary start.
    if (launch && result.exitCode === 2 && /saved-launch/.test(result.stderr)) result = await runProcess(nodePath, base, { cwd: target.projectRoot, env: childEnv, timeoutMs: START_TIMEOUT_MS });
    if (result.exitCode === 0) return outcome(target, 'start', 'completed', result.stdout.trim().split(/\r?\n/)[0] || 'Started.');
    return outcome(target, 'start', 'failed', failureSummary(result.stderr, result.stdout) || result.spawnError || `ptbk start exited with ${String(result.exitCode)}`);
}

/**
 * Pause, Resume or graceful Stop of a live engine through its shared control operations. A conflicting pending intent
 * (pausing over a pending stop) is reported for confirmation in the project dashboard, never auto-confirmed; Resume
 * never clears Health reasons and never starts a stopped project.
 *
 * @private global controls
 */
export async function controlLiveEngine(target: GlobalTarget, action: 'pause' | 'resume' | 'stop'): Promise<ProjectActionOutcome> {
    if (!target.client) return outcome(target, action, 'not-applicable', 'No engine is running; nothing was changed.');
    try {
        const reply = await target.client.request<LifecycleOutcome>(action);
        if (!reply.applied) return outcome(target, action, 'unchanged', reply.outcome);
        return outcome(target, action, reply.completed ? 'completed' : 'accepted', reply.outcome);
    } catch (error) {
        if (error instanceof PtbkError && error.details.kind === 'conflict' && error.details.data?.intent) {
            return outcome(target, action, 'needs-confirmation', `${error.message} Confirm it in the project dashboard (Enter), or resume first.`);
        }
        return outcome(target, action, /unconfirmed/i.test(errorMessage(error)) ? 'unconfirmed' : 'failed', errorMessage(error));
    }
}

/**
 * Force stop of one engine through the shared whole-engine force stop (unresponsive owners included).
 *
 * @private global controls
 */
export async function forceStopTarget(target: GlobalTarget): Promise<ProjectActionOutcome> {
    if (!target.engine) return outcome(target, 'force-stop', 'not-applicable', 'No engine is running; nothing was changed.');
    const result = await forceStopEngine(projectAt(target.projectRoot), { expected: target.engine });
    const warnings = result.warnings.length ? ` ${result.warnings.join(' ')}` : '';
    const status = result.status === 'terminated' ? 'completed' : result.status === 'not-running' ? 'unchanged' : result.status === 'unconfirmed' ? 'unconfirmed' : 'failed';
    return outcome(target, 'force-stop', status, `${result.message}${warnings}`);
}

/**
 * Why a project cannot be removed from the registry right now (undefined: verified stopped).
 */
async function removalBlocker(projectRoot: string, env: NodeJS.ProcessEnv): Promise<string | undefined> {
    const registry = await readRegistry(env);
    for (const entry of registry.entries.filter((item) => item.projectRoot === projectRoot)) {
        const engine = await verifyEngine(entry, env).catch(() => undefined);
        if (!engine || engine.status === 'live') return engine ? `its engine is ${engine.summary.state}` : 'its engine could not be verified';
        if (engine.status === 'unreachable') return `a recorded engine (PID ${entry.pid}) cannot be verified as stopped`;
    }
    if (registry.problem) return 'live discovery cannot be read, so it cannot be verified as stopped';
    if (!(await isDirectory(projectRoot))) return undefined;
    const lookup = await lookupService(projectAt(projectRoot));
    if (lookup.state === 'running') return 'its engine is running';
    if (lookup.state === 'unreachable') return `a recorded engine (PID ${lookup.record.pid}) does not answer`;
    return undefined;
}

/**
 * Removes one verified stopped project from the host registry. Eligibility is rechecked immediately before and after
 * removing the entry: an engine that started concurrently keeps (or gets back) its registration. Only the entry is
 * forgotten; the directory, Git history, configuration, Books, sessions and recovery evidence stay, and no project
 * lock is touched. A later explicit init/start registers the project again.
 *
 * @private global controls
 */
export async function removeStoppedProject(target: GlobalTarget, env: NodeJS.ProcessEnv = process.env): Promise<ProjectActionOutcome> {
    const blocker = await removalBlocker(target.projectRoot, env);
    if (blocker) return outcome(target, 'remove', 'not-applicable', `Not removed: ${blocker}. Stop it first (X, or F to force); removal never stops an engine.`);
    const removed = await forgetKnownProject(target.projectRoot, env);
    const late = await removalBlocker(target.projectRoot, env);
    if (late) {
        if (removed) await restoreKnownProject(removed, env);
        return outcome(target, 'remove', 'failed', `Not removed: ${late} (it started meanwhile); its registration was kept.`);
    }
    return outcome(target, 'remove', 'completed', `Forgotten by this host; ${target.projectRoot} and all its data are untouched (\`ptbk start --path\` registers it again).`);
}

/**
 * Applies one action to one target with the shared operations.
 *
 * @private global controls
 */
export async function applyGlobalAction(action: GlobalAction, target: GlobalTarget, env: NodeJS.ProcessEnv = process.env): Promise<ProjectActionOutcome> {
    try {
        switch (action) {
            case 'start':
                return await startKnownProject(target, env);
            case 'force-stop':
                return await forceStopTarget(target);
            case 'remove':
                return await removeStoppedProject(target, env);
            default:
                return await controlLiveEngine(target, action);
        }
    } catch (error) {
        return outcome(target, action, 'failed', errorMessage(error));
    }
}

/**
 * One-line summary of several per-project outcomes (bulk actions never claim complete success when one failed).
 *
 * @private global controls
 */
export function summarizeOutcomes(label: string, outcomes: readonly ProjectActionOutcome[]): string {
    if (!outcomes.length) return `${label}: no applicable projects.`;
    const counts = new Map<string, number>();
    for (const item of outcomes) counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
    const order: Array<ProjectActionOutcome['status']> = ['completed', 'accepted', 'unchanged', 'needs-confirmation', 'not-applicable', 'unconfirmed', 'failed'];
    const parts = order.filter((status) => counts.get(status)).map((status) => `${counts.get(status)} ${status.replace('-', ' ')}`);
    return `${label}: ${parts.join(', ')}.`;
}
