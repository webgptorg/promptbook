import { TASK_PURPOSE_VALUES } from '../book/commitments.js';
import { appendCommitment } from '../book/edit.js';
import { parseBook, type BookDiagnostic, type BookDocument } from '../book/parse.js';

/**
 * Project-relative purpose of a task: CONTENT addresses what this project is about, SYSTEM is supporting/service work
 * enabling it; absent means undefined. Presentation only: never a priority, permission or executor kind.
 *
 * @private task purpose
 */
export type TaskPurpose = 'content' | 'system';

/**
 * One written `TASK PURPOSE` value (`UNDEFINED` explicitly removes an earlier classification).
 */
type PurposeValue = (typeof TASK_PURPOSE_VALUES)[number];

/**
 * The written value of a purpose commitment (`TASK PURPOSE CONTENT` reads as one complete keyword; a lowercase value
 * after `TASK PURPOSE` is content), uppercased.
 */
function writtenPurpose(written: string, value: string): string {
    const extra = written.trim().split(/\s+/).slice(2).join(' ');
    return (extra || value.split('\n')[0]!.trim()).toUpperCase();
}

/**
 * The effective purpose of a task document under its [layering](specs/book-language/layering.md): the last valid
 * `TASK PURPOSE` in source order wins and earlier values stay as history. Unknown values are nonblocking warnings that
 * keep the previous valid value; literal (fenced/escaped) text is never a commitment.
 *
 * @private task purpose
 */
export function taskPurposeOf(document: BookDocument): { readonly purpose?: TaskPurpose; readonly diagnostics: readonly BookDiagnostic[] } {
    const diagnostics: BookDiagnostic[] = [];
    let purpose: TaskPurpose | undefined;
    for (const commitment of document.commitments) {
        const isPurpose = commitment.keyword === 'TASK PURPOSE' || (commitment.definition.unknown && /^TASK PURPOSE\b/.test(commitment.written));
        if (!isPurpose) continue;
        const value = writtenPurpose(commitment.written, commitment.value);
        if ((TASK_PURPOSE_VALUES as readonly string[]).includes(value)) {
            purpose = value === 'UNDEFINED' ? undefined : (value.toLowerCase() as TaskPurpose);
        } else {
            diagnostics.push({ line: commitment.startLine + 1, message: `TASK PURPOSE must be CONTENT, SYSTEM or UNDEFINED, not "${value}"; the earlier valid purpose stays effective.`, severity: 'warning' });
        }
    }
    return { purpose, diagnostics };
}

/**
 * Records a changed task purpose by **appending** `TASK PURPOSE <value>` (optionally after a short `TASK NOTE` with the
 * reason), preserving every earlier commitment in the Book. An unchanged effective purpose appends nothing.
 *
 * @private task purpose
 */
export function appendTaskPurpose(source: string, purpose: TaskPurpose | undefined, reason?: string): string {
    if (taskPurposeOf(parseBook(source)).purpose === purpose) return source;
    const value: PurposeValue = purpose === undefined ? 'UNDEFINED' : purpose === 'content' ? 'CONTENT' : 'SYSTEM';
    const noted = reason?.trim() ? appendCommitment(source, 'TASK NOTE', reason.trim().replace(/\s*\n\s*/g, ' ')) : source;
    return appendCommitment(noted, `TASK PURPOSE ${value}`, '');
}

/**
 * Reads a purpose a person or agent supplied (`content`, `SYSTEM`, `undefined`, …); `null` when it is not one.
 *
 * @private task purpose
 */
export function parseTaskPurpose(value: string): TaskPurpose | undefined | null {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'CONTENT') return 'content';
    if (normalized === 'SYSTEM') return 'system';
    if (normalized === 'UNDEFINED' || normalized === 'NONE' || normalized === '') return undefined;
    return null;
}
