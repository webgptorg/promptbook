import type { createTerminal } from './terminal.js';
import { InputError } from './workspace.js';

/** Editing shares terminal controls while the service remains authoritative for source ownership. @private */
export type TaskEditingTerminal = Pick<ReturnType<typeof createTerminal>, 'choose' | 'question' | 'status'>;

/** A terminal client uses the same guarded read/edit commands as the browser and API. @private */
export type TaskEditingCommand = (action: string, input?: Record<string, unknown>) => Promise<unknown>;

/** Select, edit and explicitly save one source using its exact observed revision. @private */
export async function editTaskFromTerminal(terminal: TaskEditingTerminal, snapshot: Record<string, unknown>, command: TaskEditingCommand): Promise<void> {
    const actions = (snapshot.controlCapabilities as { actions?: unknown } | undefined)?.actions;
    if (!Array.isArray(actions) || !actions.includes('read-task') || !actions.includes('edit-task')) {
        terminal.status('Task editing is unavailable in this runtime.');
        return;
    }
    const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks as Array<Record<string, any>> : [];
    if (!tasks.length) { terminal.status('There are no task sources to edit.'); return; }
    try {
        const id = await terminal.choose('Choose a task source to edit:', [...tasks.map(task => ({
            value: String(task.id), label: String(task.title || task.id), description: `${task.status || 'unknown'} · ${task.source?.relativePath || 'source details available after selection'}`,
        })), { value: '@cancel', label: 'Return to dashboard' }]);
        if (id === '@cancel') return;
        const source = await command('read-task', { id }) as { id?: unknown; revision?: unknown; content?: unknown; source?: unknown } | undefined;
        if (!source || source.id !== id || typeof source.revision !== 'string' || !source.revision || typeof source.content !== 'string') throw new InputError('The service did not return a valid task source revision. Reload the dashboard before editing.');
        const content = await terminal.question(`Edit ${String(source.source || id)}\nCtrl+S reviews the changes; Esc leaves the source unchanged. Saving requires a paused service at a safe task boundary.`, source.content);
        if (content === source.content || content === source.content.replace(/\r\n?/g, '\n')) { terminal.status('The source is unchanged.'); return; }
        const decision = await terminal.choose(`Save changes to ${String(source.source || id)}?\nThe service checks the original revision and current task ownership before writing.`, [
            { value: 'save', label: 'Save reviewed changes' }, { value: 'cancel', label: 'Cancel and keep the existing source' },
        ], 'cancel');
        if (decision !== 'save') return;
        const result = await command('edit-task', { id, revision: source.revision, content }) as { saved?: unknown } | undefined;
        if (result?.saved !== true) throw new InputError('The service did not confirm the task source was saved. Inspect the source before retrying.');
        terminal.status(`Saved ${String(source.source || id)}. The shared queue will refresh from the source.`);
    } catch (error) {
        if ((error as Error).name !== 'AbortError') throw error;
    }
}
