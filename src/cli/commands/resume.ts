import { selectedProject } from '../common.js';
import type { CommandContext } from '../context.js';
import { renderLifecycleOutcome, requireRunningService, type EngineOutcome } from '../lifecycle.js';

/**
 * Title of a resume result: the manual pause (or pending stop/restart) is removed, but independent pause reasons such
 * as a Health incident keep the engine paused.
 */
function resumeTitle(result: EngineOutcome): string {
    if (!result.applied) return /Too late/.test(result.outcome) ? 'Too late' : 'Still paused';
    if (/Cancelled/.test(result.outcome)) return 'Cancelled';
    return result.state === 'pause' || result.state === 'pausing' ? 'Still paused' : 'Running';
}

/**
 * `ptbk resume`: remove the manual pause, or cancel a pending pause/stop/restart, without interrupting or replaying the
 * current task. The engine returns to `running` only when no other pause reason (such as Health) remains.
 *
 * @private command
 */
export default async function resume(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const lookup = await requireRunningService(project, 'resume');
    const result = await lookup.client.request<EngineOutcome>('resume');
    return await renderLifecycleOutcome(context, project, lookup, resumeTitle(result), result, ['ptbk dashboard', 'ptbk status']);
}
