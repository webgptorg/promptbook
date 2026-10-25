import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { writeFileAtomicSync } from '../common/fs.js';
import type { Project } from '../project/workspace.js';

/**
 * Durable operator lifecycle intent of a project's engine (`.ptbk/service/intent.json`, runtime-only, never committed).
 *
 * Only the operator's own manual pause is recorded: OS/crash recovery restores it before any background claim, while
 * Health pause reasons are always re-evaluated from current conditions and never become manual intent. Deliberate
 * stop is recorded separately in the launch metadata.
 *
 * @private operator intent
 */
export type OperatorIntent = {
    readonly version: 1;
    /** The accepted manual pause (including one still draining), since when. */
    readonly manualPause?: { readonly since: string };
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
 * Saves the current manual pause intent synchronously, so an accepted Pause/Resume is durable before it is reported.
 *
 * @private operator intent
 */
export function saveOperatorIntent(project: Project, manualPauseSince: string | undefined): void {
    const intent: OperatorIntent = { version: 1, ...(manualPauseSince ? { manualPause: { since: manualPauseSince } } : {}), savedAt: new Date().toISOString() };
    writeFileAtomicSync(intentPath(project), `${JSON.stringify(intent, null, 4)}\n`, { mode: 0o600 });
}

/**
 * Forgets the manual pause intent: a deliberate stop replaces it, so a later explicit start runs again.
 *
 * @private operator intent
 */
export function clearOperatorIntent(project: Project): void {
    rmSync(intentPath(project), { force: true });
}
