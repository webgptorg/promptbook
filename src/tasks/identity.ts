import { createHash } from 'node:crypto';
import { normalizeAgentName } from '../book/references.js';

/**
 * File names Windows reserves regardless of extension.
 */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

/**
 * Longest name key used verbatim as a directory name; longer keys are shortened with a hash suffix.
 */
const MAX_KEY_LENGTH = 80;

/**
 * Deterministic, filesystem-safe directory name derived from a Book's **normalized** name.
 *
 * Equivalent spellings (`{Improve CSV export}`, `@ImproveCsvExport`) map to the same key; it is a pure function of
 * the normalized name, never an allocated ID. Letters/digits outside `[a-z0-9]` are hex-escaped so every script works.
 *
 * @private task identity
 */
export function nameKeyPath(name: string): string {
    const normalized = normalizeAgentName(name);
    let key = '';
    for (const character of normalized) key += /[a-z0-9]/.test(character) ? character : `_${character.codePointAt(0)!.toString(16)}`;
    if (!key) key = '_';
    if (RESERVED_NAMES.test(key)) key = `${key}_`;
    if (key.length > MAX_KEY_LENGTH) key = `${key.slice(0, MAX_KEY_LENGTH - 13)}-${createHash('sha256').update(normalized).digest('hex').slice(0, 12)}`;
    return key;
}

/**
 * Project-relative POSIX directory of a task's audit evidence: `traces/<name-key>`.
 *
 * @private task identity
 */
export function traceDirectoryOf(taskName: string): string {
    return `traces/${nameKeyPath(taskName)}`;
}

/**
 * Legacy Markdown metadata line that once carried a generated task ID (read as history only, never written).
 *
 * @private task identity
 */
export const MARKDOWN_LEGACY_ID_LINE = /^\s*<!--\s*ptbk-task-id:\s*(\S+?)\s*-->\s*$/;

/**
 * Picks a readable name that is distinct under normalization from the given taken keys (`Name`, `Name (2)`, …).
 *
 * New authoring uses this so a new task or chat does not silently shadow (or get shadowed by) an existing Book.
 *
 * @private task identity
 */
export function distinctName(base: string, taken: ReadonlySet<string>): string {
    const name = base.replace(/\s+/g, ' ').trim() || 'Untitled';
    if (!taken.has(normalizeAgentName(name))) return name;
    for (let counter = 2; ; counter++) {
        const candidate = `${name} (${counter})`;
        if (!taken.has(normalizeAgentName(candidate))) return candidate;
    }
}
