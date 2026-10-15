import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { sha256 } from '../common/fs.js';
import { parseBook } from '../book/parse.js';
import { readTaskBook, setBookControls } from './book-task.js';
import { generateTaskId, taskIdKey } from './identity.js';
import { isIgnoredMarkdown, readMarkdownTasks, setMarkdownTaskId, splitMarkdownSections } from './markdown.js';
import type { Task } from './model.js';

/**
 * Writes a newly generated stable ID into a task source that lacks one (scoped preparation before execution).
 *
 * The source must still be the revision the task was read from; concurrent edits are never overwritten.
 *
 * @private task identity
 */
export async function assignTaskId(task: Task): Promise<string> {
    if (task.id) return task.id;
    const source = await readFile(task.source.path, 'utf8');
    if (sha256(source) !== task.source.fileHash) {
        throw new PtbkError(`${task.source.relativePath} changed while its task ID was being prepared.`, { kind: 'conflict', task: task.ref, next: ['ptbk retries after reading the current source.'] });
    }
    const id = generateTaskId(task.title);
    const updated = task.source.kind === 'book' ? setBookControls(source, { 'TASK ID': id }) : setMarkdownTaskId(source, task.source.sectionHash!, id);
    await writeFile(task.source.path, updated);
    return id;
}

/**
 * IDs declared in a task source text (Book or Markdown).
 *
 * @private task identity
 */
export function declaredTaskIds(path: string, source: string): string[] {
    if (path.toLowerCase().endsWith('.book')) {
        const document = parseBook(source);
        if (document.kind !== 'task') return [];
        const id = document.commitments.find((commitment) => commitment.keyword === 'TASK ID')?.value.trim();
        return id ? [id] : [];
    }
    return splitMarkdownSections(source).flatMap((section) => (section.id ? [section.id] : []));
}

/**
 * Gives follow-up tasks written during a task their own stable IDs.
 *
 * Only tasks that did not exist before (`previous` is the source before the work, `undefined` for a new file) are
 * touched. A copied ID that belongs to another task is replaced, because a copied definition is new work.
 *
 * @private task identity
 */
export async function assignFollowUpIds(options: {
    readonly path: string;
    readonly relativePath: string;
    readonly previous: string | undefined;
    readonly otherIds: ReadonlySet<string>;
    readonly timeZone: string;
}): Promise<{ readonly changed: boolean; readonly created: string[] }> {
    const source = await readFile(options.path, 'utf8').catch(() => undefined);
    if (source === undefined) return { changed: false, created: [] };
    const taken = new Set([...options.otherIds].map(taskIdKey));
    const before = new Set((options.previous === undefined ? [] : declaredTaskIds(options.path, options.previous)).map(taskIdKey));
    const created: string[] = [];
    if (options.path.toLowerCase().endsWith('.book')) {
        const task = readTaskBook({ source, path: options.path, relativePath: options.relativePath, order: 0, timeZone: options.timeZone });
        if (!task || options.previous !== undefined) return { changed: false, created: task?.id && !before.has(taskIdKey(task.id)) ? [task.id] : [] };
        const declared = declaredTaskIds(options.path, source)[0];
        if (declared && !taken.has(taskIdKey(declared))) return { changed: false, created: [declared] };
        const id = generateTaskId(task.title);
        await writeFile(options.path, setBookControls(source, { 'TASK ID': id }));
        return { changed: true, created: [id] };
    }
    if (isIgnoredMarkdown(basename(options.path), source)) return { changed: false, created: [] };
    const previousHashes = new Set(options.previous === undefined ? [] : splitMarkdownSections(options.previous).map((section) => section.hash));
    let updated = source;
    for (const task of readMarkdownTasks({ source, path: options.path, relativePath: options.relativePath, order: 0, timeZone: options.timeZone })) {
        if (previousHashes.has(task.source.sectionHash!)) continue;
        if (task.id && !before.has(taskIdKey(task.id)) && !taken.has(taskIdKey(task.id))) {
            created.push(task.id);
            continue;
        }
        if (task.id) continue;
        const id = generateTaskId(task.title);
        updated = setMarkdownTaskId(updated, task.source.sectionHash!, id);
        created.push(id);
    }
    if (updated !== source) await writeFile(options.path, updated);
    return { changed: updated !== source, created };
}
