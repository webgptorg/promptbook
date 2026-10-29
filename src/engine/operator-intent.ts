import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { writeFileAtomicSync } from '../common/fs.js';
import type { Project } from '../project/workspace.js';

/**
 * Why a manual pause reason is active: the operator's Pause, an explicit `ptbk start --paused`, an automatic startup of
 * a deliberately stopped (stopped, force-stopped, panicked) project, or a restoration after the previous process ended
 * unexpectedly (crash, uncatchable kill, power loss), which never authorizes work by itself.
 *
 * @private operator intent
 */
export type ManualPauseCause = 'operator' | 'start-paused' | 'inactive' | 'unexpected-loss';

/**
 * Durable operator lifecycle intent of a project's engine (`.ptbk/service/intent.json`, runtime-only, never committed).
 *
 * It separates service availability from authorization to execute background work. The manual pause reason is
 * restored before any background claim, while Health pause reasons are always re-evaluated from current conditions and
 * never become manual intent. Deliberate stop is recorded separately in the launch metadata.
 *
 * @private operator intent
 */
export type OperatorIntent = {
    readonly version: 1;
    /** The accepted manual pause (including one still draining), since when and why. */
    readonly manualPause?: { readonly since: string; readonly cause?: ManualPauseCause };
    /**
     * The last owner ended through a catchable host termination request (OS shutdown, logout) while it was neither
     * stopped nor manually paused: the next automatic startup may continue its work after current checks. Its absence
     * after an unstopped run means the process disappeared ambiguously.
     */
    readonly hostTermination?: { readonly at: string };
    /** Time of saving. */
    readonly savedAt: string;
};

/**
 * Path of the operator-intent record.
 */
function intentPath(project: Project): string {
    return join(project.runtime.service, 'intent.json');
}

/**
 * Writes the record atomically and readable only by the owner.
 */
function writeIntent(project: Project, intent: Omit<OperatorIntent, 'version' | 'savedAt'>): void {
    const record: OperatorIntent = { version: 1, ...intent, savedAt: new Date().toISOString() };
    writeFileAtomicSync(intentPath(project), `${JSON.stringify(record, null, 4)}\n`, { mode: 0o600 });
}

/**
 * Reads the saved operator intent (undefined when absent or unreadable: no manual pause to restore).
 *
 * @private operator intent
 */
export function readOperatorIntent(project: Project): OperatorIntent | undefined {
    try {
        const intent = JSON.parse(readFileSync(intentPath(project), 'utf8')) as OperatorIntent;
        return intent?.version === 1 ? intent : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Saves the current manual pause intent synchronously, so an accepted Pause/Resume is durable before it is reported. A
 * live engine owns the record, so an earlier host termination no longer applies.
 *
 * @private operator intent
 */
export function saveOperatorIntent(project: Project, manualPause: OperatorIntent['manualPause'] | undefined): void {
    writeIntent(project, manualPause ? { manualPause } : {});
}

/**
 * Installs a manual pause reason before an engine is launched, so it holds before its first scheduling opportunity
 * (never by starting running and then pausing). An already saved manual pause keeps its original time and cause.
 *
 * @private operator intent
 */
export function installPausedStart(project: Project, cause: Exclude<ManualPauseCause, 'operator'>): void {
    const existing = readOperatorIntent(project)?.manualPause;
    writeIntent(project, { manualPause: existing ?? { since: new Date().toISOString(), cause } });
}

/**
 * Records that the owner received a catchable host termination request (synchronously, because the host may kill the
 * process before its drain completes). It keeps the manual pause, which still restores paused.
 *
 * @private operator intent
 */
export function recordHostTermination(project: Project): void {
    const manualPause = readOperatorIntent(project)?.manualPause;
    writeIntent(project, { ...(manualPause ? { manualPause } : {}), hostTermination: { at: new Date().toISOString() } });
}

/**
 * Forgets the manual pause intent: a deliberate stop replaces it, so a later explicit start runs again.
 *
 * @private operator intent
 */
export function clearOperatorIntent(project: Project): void {
    rmSync(intentPath(project), { force: true });
}

/**
 * How an automatic OS startup restores a persistent service: `running` may continue work after readiness and current
 * Health (a restored manual pause still holds), otherwise the cause of the manual pause it starts with.
 *
 * Deliberately stopped, force-stopped or panicked projects start directly paused for inspection and control; a
 * previous process that ended without a recorded stop or host termination disappeared ambiguously, which never grants
 * work authority.
 *
 * @private operator intent
 */
export function startupWorkIntent(launch: { readonly intentionallyStopped: boolean }, intent: OperatorIntent | undefined): 'running' | Exclude<ManualPauseCause, 'operator' | 'start-paused'> {
    if (launch.intentionallyStopped) return 'inactive';
    if (intent?.manualPause || intent?.hostTermination) return 'running';
    return 'unexpected-loss';
}
