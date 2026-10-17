import { readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { isDirectory, listDirectory, toProjectRelative } from '../common/fs.js';
import { parseReferenceValue } from '../book/references.js';
import type { BookIndex } from '../project/books.js';
import { readTaskBook } from './book-task.js';
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
    /** The project's Book index: a same-name Book ranked earlier (e.g. an agent) shadows a queued task. */
    readonly index?: BookIndex;
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
    // A task's identity is its normalized name: same-name tasks are shadowed deterministically (never merged).
    const problems: string[] = [];
    // Same ordering as the shared resolver: tier (task source 2, elsewhere 3), depth, root order, path, section.
    const rank = (task: Task): [number, number, number, string, number] => {
        const inTasks = task.source.path.startsWith(`${tasksDirectory}${sep}`);
        const depth = (inTasks ? task.source.path.slice(tasksDirectory.length + 1) : task.source.relativePath).split(/[\\/]/).length - 1;
        return [inTasks ? 2 : 3, depth, inTasks ? 1 : 3, task.source.relativePath, task.source.section ?? 0];
    };
    const compare = (a: [number, number, number, string, number], b: [number, number, number, string, number]): number =>
        a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0) || a[4] - b[4];
    const before = (a: Task, b: Task): boolean => compare(rank(a), rank(b)) < 0;
    const winners = new Map<string, Task>();
    for (const task of tasks) {
        if (!task.key) continue;
        const current = winners.get(task.key);
        if (!current || before(task, current)) winners.set(task.key, task);
    }
    const describe = (task: Task): string => `${task.source.relativePath}${task.source.section ? `#${task.source.section}` : ''}`;
    const result = tasks.map((task): Task => {
        const winner = task.key ? winners.get(task.key) : undefined;
        if (winner && winner !== task) {
            problems.push(`Task name "${task.title}" is used by ${describe(winner)} and ${describe(task)}; ${describe(winner)} wins and the other copy is shadowed (rename one of them).`);
            return { ...task, shadowedBy: describe(winner) };
        }
        const other = options.index?.winnerOf(task.key);
        const otherRank = other ? ([other.tier, other.depth, other.root === 'agents' ? 0 : other.root === 'tasks' ? 1 : other.root === 'chats' ? 2 : 3, other.relativePath, 0] as [number, number, number, string, number]) : undefined;
        // A Book task is ranked by the index itself; a Markdown section is compared with the index winner explicitly.
        if (other && otherRank && other.path !== task.source.path && (task.source.kind === 'book' || compare(otherRank, rank(task)) < 0)) {
            problems.push(`Task name "${task.title}" is shadowed by the ${other.kind} ${other.relativePath}, which wins that name.`);
            return { ...task, shadowedBy: other.relativePath };
        }
        return task;
    });
    return { tasks: result.sort((a, b) => a.source.order - b.source.order), problems, directories };
}

/**
 * Finds the task a reference names: `{Name}`, `@Name` or a bare name (by normalized name, the winning copy first),
 * an explicit source path (`tasks/x.book`, `prompts/x.md#2`) for unambiguous source inspection, or a historical
 * `#legacy-id`.
 *
 * @private task sources
 */
export function findTask(tasks: readonly Task[], reference: string): { task?: Task; shadowed?: Task[] } {
    const text = reference.trim().replace(/\\/g, '/').replace(/^\.\//, '');
    const byPath = tasks.find((task) => (task.source.kind === 'book' && task.source.relativePath === text) || (task.source.kind === 'markdown' && `${task.source.relativePath}#${task.source.section}` === text));
    if (byPath) return { task: byPath };
    const parsed = parseReferenceValue(text.replace(/^#/, ''));
    const named = parsed ? tasks.filter((task) => task.key === parsed.normalized) : [];
    const winner = named.find((task) => !task.shadowedBy) ?? named[0];
    if (winner) return { task: winner, shadowed: named.filter((task) => task !== winner) };
    // Historical references written before names were the identity (`#legacy-id`) still locate their task.
    const legacy = text.startsWith('#') ? tasks.find((task) => task.legacyId === text.slice(1)) : undefined;
    return legacy ? { task: legacy } : {};
}
