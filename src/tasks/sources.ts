import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { isDirectory, listDirectory, toProjectRelative } from '../common/fs.js';
import { readTaskBook } from './book-task.js';
import { taskIdKey } from './identity.js';
import { isIgnoredMarkdown, readMarkdownTasks } from './markdown.js';
import type { Task } from './model.js';

/**
 * Directory also scanned for Markdown tasks.
 *
 * @private task sources
 */
export const PROMPTS_DIRECTORY = 'prompts';

/**
 * Options for reading the project's task queue.
 *
 * @private task sources
 */
export type TaskSourceOptions = {
    /** Project root. */
    readonly root: string;
    /** Task source directory (relative to the project for configuration, to the invocation for `--tasks`). */
    readonly tasksDirectory: string;
    /** The task directory was supplied explicitly (a missing explicit source is an error). */
    readonly explicit?: boolean;
    /** Time zone for date interpretation. */
    readonly timeZone: string;
};

/**
 * All tasks of a project plus source-level problems.
 *
 * @private task sources
 */
export type TaskQueue = {
    /** Tasks in stable source order. */
    readonly tasks: readonly Task[];
    /** Problems not tied to one task (e.g. duplicate IDs). */
    readonly problems: readonly string[];
    /** Absolute directories that were scanned. */
    readonly directories: readonly string[];
};

/**
 * Lists top-level task files of a directory (templates, archives and assets in subdirectories are not tasks).
 */
async function topLevelTaskFiles(directory: string, markdownOnly: boolean): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await listDirectory(directory)) {
        if (!entry.isFile || entry.name.startsWith('.')) continue;
        const lower = entry.name.toLowerCase();
        if (lower.endsWith('.md') || (!markdownOnly && lower.endsWith('.book'))) files.push(join(directory, entry.name));
    }
    return files;
}

/**
 * Reads every task of the project's task sources (`tasks/` Books and Markdown, plus Markdown in `prompts/`).
 *
 * Read-only: never assigns IDs or rewrites sources.
 *
 * @private task sources
 */
export async function readTaskQueue(options: TaskSourceOptions): Promise<TaskQueue> {
    const tasksDirectory = resolve(options.root, options.tasksDirectory);
    if (!(await isDirectory(tasksDirectory)) && options.explicit) {
        throw new PtbkError(`The task source ${tasksDirectory} does not exist.`, {
            kind: 'not-found',
            project: options.root,
            next: ['Create the directory, select another `--tasks`, or run `ptbk init`.'],
        });
    }
    const directories = [tasksDirectory];
    const promptsDirectory = resolve(options.root, PROMPTS_DIRECTORY);
    if (promptsDirectory !== tasksDirectory && (await isDirectory(promptsDirectory))) directories.push(promptsDirectory);
    const tasks: Task[] = [];
    let order = 0;
    for (const directory of directories) {
        const files = await topLevelTaskFiles(directory, directory === promptsDirectory && directory !== tasksDirectory);
        for (const path of files) {
            order++;
            const source = await readFile(path, 'utf8');
            const relativePath = toProjectRelative(options.root, path);
            const name = path.slice(directory.length + 1);
            if (path.toLowerCase().endsWith('.book')) {
                const task = readTaskBook({ source, path, relativePath, order, timeZone: options.timeZone });
                if (task) tasks.push(task);
            } else if (!isIgnoredMarkdown(name, source)) {
                tasks.push(...readMarkdownTasks({ source, path, relativePath, order, timeZone: options.timeZone }));
            }
        }
    }
    // IDs differing only by case would share `traces/<task-id>/` on case-insensitive file systems.
    const problems: string[] = [];
    const byId = new Map<string, Task[]>();
    for (const task of tasks) if (task.id) byId.set(taskIdKey(task.id), [...(byId.get(taskIdKey(task.id)) ?? []), task]);
    const duplicated = new Set<string>();
    for (const [key, owners] of byId) {
        if (owners.length < 2) continue;
        duplicated.add(key);
        problems.push(`TASK ID "${owners[0]!.id}" is used by ${owners.map((owner) => `${owner.source.relativePath}${owner.source.section ? `#${owner.source.section}` : ''}`).join(', ')}.`);
    }
    const result = tasks.map((task) =>
        task.id && duplicated.has(taskIdKey(task.id))
            ? {
                  ...task,
                  ref: task.source.kind === 'markdown' ? `${task.source.relativePath}#${task.source.section}` : task.source.relativePath,
                  diagnostics: [...task.diagnostics, { line: 0, message: `Duplicate TASK ID "${task.id}"; no definition with it runs until the IDs are unique.`, severity: 'error' as const }],
              }
            : task,
    );
    return { tasks: result.sort((a, b) => a.source.order - b.source.order), problems, directories };
}

/**
 * Finds the unique task matching a reference (`#id`, `id`, a source path or `path#section`).
 *
 * @private task sources
 */
export function findTask(tasks: readonly Task[], reference: string): { task?: Task; ambiguous?: Task[] } {
    const text = reference.trim().replace(/\\/g, '/').replace(/^\.\//, '');
    const candidates = tasks.filter((task) => {
        if (task.ref === text) return true;
        if (task.id && [taskIdKey(task.id), `#${taskIdKey(task.id)}`].includes(taskIdKey(text))) return true;
        if (task.source.kind === 'book' && task.source.relativePath === text) return true;
        if (task.source.kind === 'markdown' && `${task.source.relativePath}#${task.source.section}` === text) return true;
        return false;
    });
    if (candidates.length === 1) return { task: candidates[0] };
    if (candidates.length > 1) return { ambiguous: candidates };
    return {};
}
