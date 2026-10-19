import { EXIT, PtbkError } from '../common/errors.js';
import type { Agenda } from '../engine/agenda.js';
import type { Project } from '../project/workspace.js';
import { lookupService, type ServiceLookup } from '../service/control.js';
import type { PanelTone } from '../ui/panels.js';
import type { CommandContext } from './context.js';
import { liveSnapshot, renderServiceResult } from './service-view.js';

/**
 * The verified running service of the selected project, or an actionable error (a lifecycle command never starts one).
 *
 * @private CLI lifecycle
 */
export async function requireRunningService(project: Project, action: string): Promise<Extract<ServiceLookup, { state: 'running' }>> {
    const lookup = await lookupService(project);
    if (lookup.state === 'running') return lookup;
    if (lookup.state === 'unreachable') {
        throw new PtbkError('The recorded ptbk service does not answer.', {
            kind: 'technical',
            project: project.root,
            reason: `PID ${lookup.record.pid}: ${lookup.reason}`,
            effect: `Nothing was ${action}d.`,
            next: ['Run `ptbk status` to inspect it.'],
        });
    }
    throw new PtbkError('No ptbk service is running for this project.', {
        kind: 'not-found',
        project: project.root,
        effect: `Nothing to ${action}; no service was started.`,
        next: ['Start the agenda with `ptbk start`.'],
    });
}

/**
 * Lifecycle outcome reported by the engine.
 *
 * @private CLI lifecycle
 */
export type EngineOutcome = { readonly action: string; readonly applied: boolean; readonly completed?: boolean; readonly state?: string; readonly outcome: string };

/**
 * Renders a one-shot lifecycle result with the shared status view, distinguishing pending from completed outcomes.
 *
 * @private CLI lifecycle
 */
export async function renderLifecycleOutcome(context: CommandContext, project: Project, lookup: Extract<ServiceLookup, { state: 'running' }>, title: string, outcome: EngineOutcome, next: string[]): Promise<number> {
    const snapshot = await liveSnapshot(project, lookup);
    const tone: PanelTone = !outcome.applied ? 'error' : outcome.completed ? 'success' : 'attention';
    // The engine's message may repeat the title ("Pause pending: …", "Paused.").
    const repeated = outcome.outcome.startsWith(title) && /^([:.]|$)/.test(outcome.outcome.slice(title.length));
    const message = repeated ? outcome.outcome.slice(title.length).replace(/^[:.]\s*/, '') : outcome.outcome;
    await renderServiceResult(context, snapshot, { client: lookup.client, outcome: { title, message: message || undefined, tone }, next });
    return outcome.applied ? EXIT.success : EXIT.failure;
}

/**
 * Signal handling of an invocation that owns an engine (foreground start, finite run): the first Ctrl+C/termination
 * request drains gracefully and preserves recovery state; a second Ctrl+C is an explicit force stop (announced, never
 * silent). Returns the removal function.
 *
 * @private CLI lifecycle
 */
export function ownerSignals(agenda: Agenda, write: (line: string) => void): () => void {
    let interrupted = 0;
    const onInterrupt = (): void => {
        interrupted++;
        if (interrupted === 1) {
            agenda.requestStop({});
            write('Stopping gracefully after the current task (recovery state is kept). Press Ctrl+C again to force stop now.\n');
        } else agenda.requestStop({ force: true });
    };
    const onTerminate = (): void => {
        agenda.requestStop({ signal: true });
    };
    process.on('SIGINT', onInterrupt);
    process.on('SIGTERM', onTerminate);
    return () => {
        process.off('SIGINT', onInterrupt);
        process.off('SIGTERM', onTerminate);
    };
}
