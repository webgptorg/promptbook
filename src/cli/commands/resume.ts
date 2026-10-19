import { selectedProject } from '../common.js';
import type { CommandContext } from '../context.js';
import { renderLifecycleOutcome, requireRunningService, type EngineOutcome } from '../lifecycle.js';

/**
 * `ptbk resume`: resume a paused engine, or cancel a pending pause/stop/restart and return to `running` without
 * interrupting or replaying the current task.
 *
 * @private command
 */
export default async function resume(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const lookup = await requireRunningService(project, 'resume');
    const result = await lookup.client.request<EngineOutcome>('resume');
    return await renderLifecycleOutcome(context, project, lookup, result.applied ? (/Cancelled/.test(result.outcome) ? 'Cancelled' : 'Running') : 'Too late', result, ['ptbk dashboard', 'ptbk status']);
}
