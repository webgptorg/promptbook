import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import type { Workspace } from './domain.js';
import { prepareAuthoredTask, type PreparedAuthoredTask } from './authoring.js';
import { promptChoice } from './choices.js';
import { promptText } from './interactive.js';
import { installedEngineVersion } from './version.js';
import { confinePath, InputError } from './workspace.js';

/** Supplied authoring inputs are reused rather than asked for again. @private */
export interface AddWizardOptions {
    description?: string; template?: string; priority?: number; signal?: AbortSignal;
    input?: Readable; output?: Writable;
}

/** Inspect the selected project's templates without creating files or following escaping links. */
async function taskTemplates(workspace: Workspace): Promise<Array<{ value: string; label: string }>> {
    const directory = await confinePath(workspace.projectPath, join(workspace.tasksPath, 'templates'));
    try {
        return (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile() && /\.(?:book|md|txt)$/i.test(entry.name))
            .sort((a, b) => a.name.localeCompare(b.name)).map(entry => ({ value: relative(workspace.projectPath, join(directory, entry.name)), label: entry.name }));
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}

/** Review exact task bytes in a finite wizard; cancellation never creates a task. @private */
export async function addTaskWizard(workspace: Workspace, options: AddWizardOptions = {}): Promise<PreparedAuthoredTask | undefined> {
    const version = await installedEngineVersion();
    const surface = { input: options.input, output: options.output, signal: options.signal };
    const heading = (step: number): string => `Promptbook ${version} · Add task · ${step}/4`;
    let description = options.description;
    let template = options.template;
    let priority = options.priority;
    /** Keep descriptions in the shared multiline editor while enforcing nonempty authoring input. */
    const describe = (): Promise<string> => promptText('Task description', { ...surface, heading: heading(1), initial: description,
        validate: value => value.trim() ? undefined : 'Describe the task before continuing.' });
    /** Select existing templates with labels; an omitted template keeps the description as supplied. */
    const selectTemplate = async (): Promise<void> => {
        const templates = await taskTemplates(workspace);
        if (!templates.length) { template = undefined; return; }
        const choice = await promptChoice('Task template', [{ value: '@none', label: 'No template', description: 'Use the task description directly.' }, ...templates], {
            ...surface, heading: heading(2), initial: template && templates.some(item => item.value === template) ? template : '@none',
        });
        template = choice === '@none' ? undefined : choice;
    };
    /** Offer common priorities while retaining arbitrary nonnegative priorities through a custom field. */
    const selectPriority = async (): Promise<void> => {
        const choice = await promptChoice('Task priority (higher values run first)', [
            { value: '0', label: 'Normal · 0' }, { value: '1', label: 'Raised · 1' },
            { value: '2', label: 'High · 2' }, { value: '3', label: 'Urgent · 3' },
            { value: 'custom', label: 'Custom priority…' },
        ], { ...surface, heading: heading(3), initial: priority !== undefined && priority <= 3 ? String(priority) : priority === undefined ? '0' : 'custom' });
        if (choice !== 'custom') { priority = Number(choice); return; }
        const value = await promptText('Custom nonnegative priority', { ...surface, heading: heading(3), initial: String(priority ?? 0),
            validate: text => /^\d+$/.test(text.trim()) && Number.isSafeInteger(Number(text.trim())) ? undefined : 'Use a nonnegative safe integer.' });
        priority = Number(value.trim());
    };
    if (description === undefined) description = await describe();
    if (!description.trim()) throw new InputError('A non-empty task description is required.');
    if (options.template === undefined) await selectTemplate();
    if (options.priority === undefined) await selectPriority();
    for (;;) {
        const prepared = await prepareAuthoredTask(workspace, description, { template, priority });
        const action = await promptChoice('Review the task before saving', [
            { value: 'save', label: 'Save this task' },
            { value: 'description', label: 'Back to description' },
            { value: 'template', label: 'Back to template' },
            { value: 'priority', label: 'Back to priority' },
            { value: 'cancel', label: 'Cancel without creating a task' },
        ], { ...surface, heading: heading(4), initial: 'cancel', preview: `${relative(workspace.projectPath, prepared.path)}\n${prepared.content}` });
        if (action === 'save') return prepared;
        if (action === 'cancel') return undefined;
        if (action === 'description') description = await describe();
        else if (action === 'template') await selectTemplate();
        else await selectPriority();
    }
}
