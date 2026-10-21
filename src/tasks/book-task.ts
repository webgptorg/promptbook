import { parseInterval } from '../common/duration.js';
import { sha256 } from '../common/fs.js';
import { formatIsoWithOffset, parseDateTime } from '../common/time.js';
import { appendCommitment, setControlCommitment } from '../book/edit.js';
import { commitmentsOf, parseBook, singleValue, type BookDocument } from '../book/parse.js';
import { THINKING_LEVELS, type ThinkingLevel } from '../project/config.js';
import { nameKey, nameReference, type DeclaredStatus, type Task, type TaskDiagnostic } from './model.js';
import { parsePriority } from './priority.js';

/**
 * Control commitments a task recognizes.
 */
const TASK_CONTROLS = new Set([
    'TASK ID',
    'ENTITY',
    'LINK',
    'TASK AGENT',
    'TASK HARNESS',
    'TASK MODEL',
    'TASK THINKING LEVEL',
    'TASK PRIORITY',
    'TASK AFTER',
    'TASK DUE DATE',
    'TASK DONE',
    'TASK STATUS',
    'TASK REPEAT',
    'TASK DEPENDS ON',
    'TASK PARENT',
    'TASK RUNNER',
    'TASK NOTE',
    'TASK ORIGIN',
]);

/**
 * Valid `TASK STATUS` values.
 */
const STATUS_VALUES = new Set(['todo', 'not-ready', 'failed', 'retired']);

/**
 * Splits a reference list (`{Multi word task}, @other #a tasks/c.book`); a `{…}` reference keeps its spaces.
 *
 * @private task Books
 */
export function splitTaskReferences(value: string): string[] {
    // A mistaken `{{…}}` stays one token so it is reported whole instead of as two broken halves.
    return value.match(/\{\{[^{}\n]*\}\}|\{[^{}\n]*\}|[^,\s]+/g) ?? [];
}

/**
 * Extracts selectors from a `TASK RUNNER` value (backtick tokens or whitespace-separated words).
 */
function runnerSelectors(value: string): string[] {
    const ticks = [...value.matchAll(/`([^`]+)`/g)].map((match) => match[1]!.trim()).filter(Boolean);
    return ticks.length ? ticks : value.split(/\s+/).filter(Boolean);
}

/**
 * Options of reading one task Book.
 *
 * @private task Books
 */
export type TaskBookOptions = {
    readonly source: string;
    readonly path: string;
    readonly relativePath: string;
    readonly order: number;
    readonly timeZone: string;
};

/**
 * Reads a task Book (`TASK <name>` declares the task and its name) into a task.
 *
 * Malformed control commitments and syntax errors keep the task from running. A source in the task folder written in
 * former syntax (a plain name line) is listed as a blocked task with a conversion hint, never dispatched; Books that
 * declare (or formerly declared) an agent or chat are not tasks wherever they are stored.
 *
 * @private task Books
 */
export function readTaskBook(options: TaskBookOptions): Task | undefined {
    const document = parseBook(options.source);
    if (document.kind === 'task') return taskFromDocument(document, options);
    const legacyTask = document.kind === 'invalid' && document.name && !document.declaredKind && document.legacy && document.legacy.entity !== 'agent' && document.legacy.entity !== 'chat';
    const uppercaseTask = document.kind === 'invalid' && document.legacy?.uppercaseName && /^TASK /.test(document.lines[document.headerLine] ?? '');
    return legacyTask || uppercaseTask ? taskFromDocument(document, options) : undefined;
}

/**
 * Builds a task from a parsed task document.
 */
function taskFromDocument(document: BookDocument, options: TaskBookOptions): Task {
    const diagnostics: TaskDiagnostic[] = document.diagnostics
        .filter((diagnostic) => !/later `TASK` line/.test(diagnostic.message))
        .map((diagnostic) => ({ line: diagnostic.line, message: diagnostic.message, severity: diagnostic.severity }));
    const single = (keyword: string): string | undefined => {
        const result = singleValue(document, keyword);
        if (result.conflict) diagnostics.push({ line: result.conflict.line, message: result.conflict.message, severity: 'error' });
        if (result.value !== undefined && result.value === '' && keyword !== 'TASK STATUS') {
            diagnostics.push({ line: (result.commitment?.startLine ?? 0) + 1, message: `\`${keyword}\` has no value.`, severity: 'error' });
            return undefined;
        }
        return result.value;
    };
    for (const commitment of document.commitments) {
        if (commitment.definition.unknown && /^TASK /.test(commitment.keyword)) {
            diagnostics.push({ line: commitment.startLine + 1, message: `Unsupported task control \`${commitment.written}\`; it cannot be ignored, so the task is blocked.`, severity: 'error' });
        } else if (commitment.definition.scope === 'task' && commitment.definition.kind !== 'declaration' && !TASK_CONTROLS.has(commitment.keyword)) {
            diagnostics.push({ line: commitment.startLine + 1, message: `Unsupported task control \`${commitment.written}\`.`, severity: 'error' });
        }
    }
    const legacyId = commitmentsOf(document, 'TASK ID')[0]?.value || undefined;
    const key = nameKey(document.name);
    if (!key) diagnostics.push({ line: document.headerLine + 1, message: 'The task name is empty after normalization.', severity: 'error' });
    const thinking = single('TASK THINKING LEVEL');
    if (thinking !== undefined && !THINKING_LEVELS.includes(thinking as ThinkingLevel)) {
        diagnostics.push({ line: 0, message: `TASK THINKING LEVEL "${thinking}" is not one of ${THINKING_LEVELS.join(', ')}.`, severity: 'error' });
    }
    const priorityRaw = single('TASK PRIORITY');
    const priority = parsePriority(priorityRaw);
    if (priority.error) diagnostics.push({ line: 0, message: priority.error, severity: 'error' });
    const afterRaw = single('TASK AFTER');
    let after: number | undefined;
    if (afterRaw !== undefined) {
        const parsed = parseDateTime(afterRaw, options.timeZone);
        if (parsed.ok) after = parsed.epochMs;
        else diagnostics.push({ line: 0, message: `TASK AFTER: ${parsed.reason}`, severity: 'error' });
    }
    const due = single('TASK DUE DATE');
    if (due !== undefined && !parseDateTime(due, options.timeZone).ok) diagnostics.push({ line: 0, message: `TASK DUE DATE "${due}" is not a valid date.`, severity: 'warning' });
    const repeatRaw = single('TASK REPEAT');
    let repeatMs: number | undefined;
    if (repeatRaw !== undefined) {
        const parsed = parseInterval(repeatRaw);
        if (parsed.ok) repeatMs = parsed.ms;
        else diagnostics.push({ line: 0, message: `TASK REPEAT: ${parsed.reason}`, severity: 'error' });
    }
    const doneStamps = commitmentsOf(document, 'TASK DONE').map((commitment) => commitment.value);
    for (const stamp of doneStamps) {
        if (stamp !== 'unknown' && !/^unknown\b/.test(stamp) && !parseDateTime(stamp.split(/\s+/)[0] ?? '', options.timeZone).ok) {
            diagnostics.push({ line: 0, message: `TASK DONE "${stamp}" is not a timestamp with timezone (or \`unknown\`).`, severity: 'error' });
        }
    }
    const statusRaw = single('TASK STATUS');
    let status: DeclaredStatus = 'todo';
    if (statusRaw !== undefined) {
        const normalized = statusRaw.trim().toLowerCase();
        if (!STATUS_VALUES.has(normalized)) {
            diagnostics.push({ line: 0, message: `TASK STATUS "${statusRaw}" is not one of todo, not-ready, failed, retired.`, severity: 'error' });
            status = 'not-ready';
        } else status = normalized as DeclaredStatus;
    }
    if (status === 'todo' && doneStamps.length && repeatMs === undefined) status = 'done';
    const text = options.source;
    const description = commitmentsOf(document, 'GOAL')
        .map((goal) => goal.body)
        .join('\n\n');
    const placeholder = /@@@/.test(document.name) || /@@@/.test(description) || /@@@/.test(document.legacy?.introduction?.text ?? '');
    return {
        ref: nameReference(document.name),
        key,
        legacyId,
        title: document.name,
        description: description || (document.legacy?.introduction?.text ?? ''),
        rules: commitmentsOf(document, 'RULE').map((rule) => rule.body),
        source: { kind: 'book', path: options.path, relativePath: options.relativePath, fileHash: sha256(options.source), order: options.order },
        status,
        doneStamps,
        priority,
        after,
        afterRaw,
        due,
        repeatMs,
        repeatRaw,
        dependsOn: commitmentsOf(document, 'TASK DEPENDS ON').flatMap((commitment) => splitTaskReferences(commitment.value)),
        parent: single('TASK PARENT'),
        routing: {
            agent: single('TASK AGENT'),
            harness: single('TASK HARNESS'),
            model: single('TASK MODEL'),
            thinkingLevel: THINKING_LEVELS.includes(thinking as ThinkingLevel) ? (thinking as ThinkingLevel) : undefined,
            runners: commitmentsOf(document, 'TASK RUNNER').flatMap((commitment) => runnerSelectors(commitment.value)),
        },
        origin: single('TASK ORIGIN'),
        notes: commitmentsOf(document, 'TASK NOTE').map((note) => note.body),
        placeholder,
        diagnostics,
        text,
    };
}

/**
 * Appends a completion stamp (`TASK DONE <timestamp with offset>`).
 *
 * @private task Books
 */
export function stampBookCompletion(source: string, epochMs: number, timeZone: string): string {
    return appendCommitment(source, 'TASK DONE', formatIsoWithOffset(epochMs, timeZone));
}

/**
 * Sets routing/control commitments (only those provided).
 *
 * @private task Books
 */
export function setBookControls(source: string, controls: Readonly<Record<string, string | undefined>>): string {
    let result = source;
    for (const [keyword, value] of Object.entries(controls)) {
        if (value !== undefined) result = setControlCommitment(result, keyword, value);
    }
    return result;
}
