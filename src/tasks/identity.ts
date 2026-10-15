import { shortId, slugify } from '../common/ids.js';

/**
 * Shape of a task ID: one filesystem-safe token (it names `traces/<task-id>/` on every platform).
 */
const TASK_ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

/**
 * File names Windows reserves regardless of extension.
 */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

/**
 * Explains why a task ID is not usable, or returns `undefined` for a valid ID.
 *
 * IDs must be single path-safe tokens: letters, digits, `.`, `_` or `-`, starting with a letter or digit, without
 * `..`, a trailing dot or a name reserved by Windows.
 *
 * @private task identity
 */
export function taskIdProblem(id: string): string | undefined {
    if (!TASK_ID_SHAPE.test(id)) return `TASK ID "${id}" must be one token (at most 80 letters, digits, '.', '_' or '-', starting with a letter or digit).`;
    if (id.includes('..') || id.endsWith('.')) return `TASK ID "${id}" must not contain ".." or end with a dot (it names traces/${id}/).`;
    if (RESERVED_NAMES.test(id)) return `TASK ID "${id}" is a reserved file name on Windows.`;
    return undefined;
}

/**
 * Key comparing task IDs on case-insensitive file systems (two IDs differing only by case would share a trace directory).
 *
 * @private task identity
 */
export function taskIdKey(id: string): string {
    return id.toLowerCase();
}

/**
 * Generates a new, readable and practically unique task ID (`improve-csv-export-k3x9qa`).
 *
 * The ID never changes afterwards, even when the title does.
 *
 * @private task identity
 */
export function generateTaskId(title: string): string {
    return `${slugify(title, 40)}-${shortId(6)}`;
}

/**
 * Markdown metadata line carrying a section's task ID.
 *
 * @private task identity
 */
export const MARKDOWN_TASK_ID_LINE = /^\s*<!--\s*ptbk-task-id:\s*(\S+?)\s*-->\s*$/;

/**
 * Renders the Markdown task ID metadata line.
 *
 * @private task identity
 */
export function markdownTaskIdLine(id: string): string {
    return `<!-- ptbk-task-id: ${id} -->`;
}

/**
 * Project-relative POSIX directory holding a task's audit evidence.
 *
 * @private task identity
 */
export function traceDirectoryOf(id: string): string {
    return `traces/${id}`;
}
