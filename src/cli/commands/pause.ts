import { EXIT, PtbkError } from '../../common/errors.js';
import { confirm } from '../../ui/prompts.js';
import { selectedProject } from '../common.js';
import type { CommandContext } from '../context.js';
import { renderLifecycleOutcome, requireRunningService, type EngineOutcome } from '../lifecycle.js';

/**
 * `ptbk pause`: stop new task claims; the current task settles first (`pausing`), then the engine stays alive in
 * `pause`. Replacing a pending stop/restart requires explicit confirmation (never an invisible prompt).
 *
 * @private command
 */
export default async function pause(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const lookup = await requireRunningService(project, 'pause');
    let result: EngineOutcome;
    try {
        result = await lookup.client.request<EngineOutcome>('pause');
    } catch (error) {
        if (!(error instanceof PtbkError) || error.details.kind !== 'conflict' || !error.details.data?.intent) throw error;
        // Noninteractive callers get the conflict with its next steps (resume, then pause) instead of a hidden prompt.
        if (!context.terminal.interactive) throw error;
        const data = error.details.data;
        const answer = await confirm(context.terminal, {
            frame: { title: 'ptbk pause', step: 'Pending shutdown' },
            question: `A ${String(data.intent)} is pending. Cancel it and pause instead?`,
            defaultYes: false,
            yesLabel: `Yes, cancel the ${String(data.intent)} and pause`,
            noLabel: `No, keep the pending ${String(data.intent)}`,
        });
        if (answer !== true) {
            context.terminal.write(`Nothing changed; the ${String(data.intent)} stays pending.\n`);
            return EXIT.incomplete;
        }
        result = await lookup.client.request<EngineOutcome>('pause', { replaceStop: true, revision: data.revision });
    }
    return await renderLifecycleOutcome(context, project, lookup, result.state === 'pause' ? 'Paused' : result.applied ? 'Pause pending' : 'Not paused', result, result.state === 'pause' ? ['ptbk resume', 'ptbk dashboard'] : ['ptbk status', 'ptbk resume']);
}
