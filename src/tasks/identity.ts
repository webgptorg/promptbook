import { createHash } from 'node:crypto';
import { PtbkError } from '../common/errors.js';
import { normalizeAgentName } from '../book/references.js';
import { declarationName } from '../book/write.js';
import { creationTimestamp } from '../common/time.js';

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
 * Literal trace-directory component of a task source: its actual filename without the final `.book` (or legacy
 * `.md`) extension, never derived from the declared TASK name, normalized, slugified, hashed or allocated.
 *
 * Returns `undefined` for a basename that cannot safely name a directory (empty, `.`/`..`, path separators).
 *
 * @private task identity
 */
export function traceBasenameOf(sourcePath: string): string | undefined {
    const filename = sourcePath.replace(/\\/g, '/').split('/').pop() ?? '';
    const basename = filename.replace(/\.(book|md)$/i, '');
    if (!basename.trim() || basename === '.' || basename === '..' || /[\\/\0]/.test(basename)) return undefined;
    return basename;
}

/**
 * Project-relative POSIX directory of a task's audit evidence: `traces/<task-file-basename>`, copying the actual
 * source filename literally without its final extension (a storage convention, not the task's logical identity).
 *
 * @private task identity
 */
export function traceDirectoryOf(sourcePath: string): string {
    const basename = traceBasenameOf(sourcePath);
    if (!basename) throw new PtbkError(`The task source ${sourcePath} has no usable filename for its trace directory.`, { kind: 'configuration', next: ['Rename the task source to a readable `.book` filename.'] });
    return `traces/${basename}`;
}

/**
 * Root directory of external-action audit records (versioned independently of traces; never Book sources).
 *
 * @private task identity
 */
export const ACTIONS_DIRECTORY = 'actions';

/**
 * Project-relative POSIX directory of a task's external-action records: `actions/<task-file-basename>`, using exactly
 * the literal source-basename mapping of its trace directory.
 *
 * @private task identity
 */
export function actionDirectoryOf(sourcePath: string): string {
    const basename = traceBasenameOf(sourcePath);
    if (!basename) throw new PtbkError(`The task source ${sourcePath} has no usable filename for its action records.`, { kind: 'configuration', next: ['Rename the task source to a readable `.book` filename.'] });
    return `${ACTIONS_DIRECTORY}/${basename}`;
}

/**
 * Directory where engines before the source-filename convention stored a task's evidence (`traces/<name-key>`).
 * It remains historical evidence and is only linked, never written to again.
 *
 * @private task identity
 */
export function legacyTraceDirectoryOf(taskName: string): string {
    return `traces/${nameKeyPath(taskName)}`;
}

/**
 * Groups task sources whose trace directories would collide (different sources, same literal basename, e.g.
 * `tasks/a.book` and `prompts/a.md`). Such evidence destinations are ambiguous and must be resolved explicitly.
 *
 * @private task identity
 */
export function traceDirectoryConflicts(sourcePaths: Iterable<string>): Map<string, string[]> {
    const bySlot = new Map<string, Set<string>>();
    for (const path of sourcePaths) {
        const basename = traceBasenameOf(path);
        if (!basename) continue;
        // Case-insensitive file systems would merge directories differing only by case.
        const slot = basename.toLowerCase();
        const sources = bySlot.get(slot) ?? new Set<string>();
        sources.add(path.replace(/\\/g, '/'));
        bySlot.set(slot, sources);
    }
    const conflicts = new Map<string, string[]>();
    for (const [slot, sources] of bySlot) if (sources.size > 1) conflicts.set(slot, [...sources].sort());
    return conflicts;
}

/**
 * Legacy Markdown metadata line that once carried a generated task ID (read as history only, never written).
 *
 * @private task identity
 */
export const MARKDOWN_LEGACY_ID_LINE = /^\s*<!--\s*ptbk-task-id:\s*(\S+?)\s*-->\s*$/;

/**
 * Normalized names reserved by the engine's built-ins (never given to a generated Book).
 */
const RESERVED_KEYS: readonly string[] = ['void', 'null', '0', 'user', 'expert'];

/**
 * Picks a readable name that is distinct under normalization from the given taken keys (`Name`, `Name (2)`, …).
 *
 * The name is spelled so it can follow a declaration keyword; built-in names are never taken.
 *
 * @private task identity
 */
export function distinctName(base: string, taken: ReadonlySet<string>): string {
    const name = declarationName(base) || 'Untitled';
    const occupied = (candidate: string): boolean => taken.has(normalizeAgentName(candidate)) || RESERVED_KEYS.includes(normalizeAgentName(candidate));
    if (!occupied(name)) return name;
    for (let counter = 2; ; counter++) {
        const candidate = `${name} (${counter})`;
        if (!occupied(candidate)) return candidate;
    }
}

/**
 * The name of a newly created task or chat: a readable title plus its creation date and time
 * (`Improve CSV export — 2026-10-18 01:25:00`), made distinct from every taken normalized name.
 *
 * Allocate it once per new entity; reopening, replying, retrying or recurring keeps the saved name. The date is
 * ordinary name text, never parsed back.
 *
 * @private task identity
 */
export function generatedName(title: string, options: { readonly taken: ReadonlySet<string>; readonly timeZone: string; readonly now?: number }): string {
    const readable = title.replace(/\s+/g, ' ').trim() || 'Untitled';
    return distinctName(`${readable} — ${creationTimestamp(options.now ?? Date.now(), options.timeZone)}`, options.taken);
}
