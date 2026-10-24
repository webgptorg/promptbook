import { UNCONSTRAINED } from '../book/model.js';
import { sha256 } from '../common/fs.js';
import { parseDateTime } from '../common/time.js';
import { PtbkError } from '../common/errors.js';
import { MARKDOWN_LEGACY_ID_LINE } from './identity.js';
import { nameKey, nameReference, type DeclaredStatus, type Task, type TaskDiagnostic } from './model.js';

/**
 * Marker comment excluding a Markdown file from the queue.
 */
const IGNORE_MARKER = /<!--\s*ptbk-coder-ignore\s*-->/;

/**
 * Control-line marker, e.g. `[ ]`, `[x]`, `[-]`.
 */
const CONTROL_LINE = /^\s*\[(.)\](?:\s+(.*))?$/u;

/**
 * Declared state per marker character.
 */
const MARKER_STATUS: Readonly<Record<string, DeclaredStatus>> = {
    ' ': 'todo',
    x: 'done',
    X: 'done',
    '-': 'not-ready',
    '.': 'not-ready',
    '^': 'needs-recovery',
    '!': 'failed',
};

/**
 * One `---`-separated section of a Markdown task file.
 *
 * @private Markdown tasks
 */
export type MarkdownSection = {
    /** 1-based section number. */
    readonly index: number;
    /** 0-based first line in the file. */
    readonly startLine: number;
    /** 0-based line after the section. */
    readonly endLine: number;
    /** Section lines. */
    readonly lines: readonly string[];
    /** Index (within `lines`) of the control line, when it has a marker. */
    readonly controlLine?: number;
    /** Marker character. */
    readonly marker?: string;
    /** Control metadata after the marker. */
    readonly controlRest: string;
    /** Index (within `lines`) of the title line. */
    readonly titleLine?: number;
    /** Title text. */
    readonly title?: string;
    /** Description after the title. */
    readonly description: string;
    /** Legacy `<!-- ptbk-task-id: … -->` value (historical metadata only, never identity). */
    readonly legacyId?: string;
    /** Index (within `lines`) of that legacy metadata line. */
    readonly idLine?: number;
    /** Revision hash: section content without its control and legacy metadata lines (locates the section for writes). */
    readonly hash: string;
};

/**
 * Splits Markdown into sections at standalone `---` lines outside fenced blocks.
 *
 * @private Markdown tasks
 */
export function splitMarkdownSections(source: string): MarkdownSection[] {
    const lines = source.split(/\r?\n/);
    const sections: MarkdownSection[] = [];
    let start = 0;
    let fence: string | undefined;
    const close = (end: number): void => {
        sections.push(analyzeSection(lines.slice(start, end), sections.length + 1, start, end));
        start = end + 1;
    };
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index]!;
        const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
            continue;
        }
        if (marker) {
            fence = marker;
            continue;
        }
        if (line.trim() === '---') close(index);
    }
    sections.push(analyzeSection(lines.slice(start), sections.length + 1, start, lines.length));
    return sections;
}

/**
 * Interprets one section's control line, title and description.
 *
 * A legacy task ID comment is historical metadata: it is neither the control line, the title nor the description.
 */
function analyzeSection(lines: string[], index: number, startLine: number, endLine: number): MarkdownSection {
    const idLine = lines.findIndex((line) => MARKDOWN_LEGACY_ID_LINE.test(line));
    const legacyId = idLine >= 0 ? MARKDOWN_LEGACY_ID_LINE.exec(lines[idLine]!)![1] : undefined;
    const content = (line: string, lineIndex: number): boolean => lineIndex !== idLine && line.trim() !== '';
    let cursor = lines.findIndex(content);
    let controlLine: number | undefined;
    let marker: string | undefined;
    let controlRest = '';
    if (cursor >= 0) {
        const match = CONTROL_LINE.exec(lines[cursor]!);
        if (match) {
            controlLine = cursor;
            marker = match[1];
            controlRest = (match[2] ?? '').trim();
            cursor = lines.findIndex((line, lineIndex) => lineIndex > controlLine! && content(line, lineIndex));
        }
    }
    const titleLine = cursor >= 0 ? cursor : undefined;
    const title = titleLine !== undefined ? lines[titleLine]!.trim() : undefined;
    const description = titleLine !== undefined ? lines.filter((_, lineIndex) => lineIndex > titleLine && lineIndex !== idLine).join('\n').trim() : '';
    const identity = lines.filter((_, lineIndex) => lineIndex !== controlLine && lineIndex !== idLine).join('\n').trim();
    return {
        index,
        startLine,
        endLine,
        lines,
        controlLine,
        marker,
        controlRest,
        titleLine,
        title,
        description,
        legacyId,
        idLine: idLine >= 0 ? idLine : undefined,
        hash: sha256(identity).slice(0, 16),
    };
}

/**
 * Parses the control metadata: `!` priority, backtick time tokens and backtick selectors.
 */
function parseControlMetadata(rest: string, timeZone: string, diagnostics: TaskDiagnostic[], line: number): { priority: number; after?: number; afterRaw?: string; selectors: string[] } {
    let priority = 0;
    for (const token of rest.split(/\s+/)) if (/^!+$/.test(token)) priority += token.length;
    const selectors: string[] = [];
    let after: number | undefined;
    let afterRaw: string | undefined;
    for (const match of rest.matchAll(/`([^`]+)`/g)) {
        const token = match[1]!.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(token)) {
            const parsed = parseDateTime(token, timeZone);
            if (!parsed.ok) {
                diagnostics.push({ line, message: `Time token \`${token}\`: ${parsed.reason}`, severity: 'error' });
                continue;
            }
            if (after !== undefined && after !== parsed.epochMs) diagnostics.push({ line, message: 'Conflicting earliest-start time tokens.', severity: 'error' });
            after = Math.max(after ?? parsed.epochMs, parsed.epochMs);
            afterRaw = token;
        } else if (token) selectors.push(token);
    }
    return { priority, after, afterRaw, selectors };
}

/**
 * Checks whether a Markdown file is excluded from the queue.
 *
 * @private Markdown tasks
 */
export function isIgnoredMarkdown(fileName: string, source: string): boolean {
    return /^readme\.md$/i.test(fileName) || IGNORE_MARKER.test(source);
}

/**
 * Reads the tasks of a Markdown file (empty sections are not tasks).
 *
 * @private Markdown tasks
 */
export function readMarkdownTasks(options: { source: string; path: string; relativePath: string; order: number; timeZone: string }): Task[] {
    const fileHash = sha256(options.source);
    const tasks: Task[] = [];
    for (const section of splitMarkdownSections(options.source)) {
        if (!section.title) continue;
        const diagnostics: TaskDiagnostic[] = [];
        const line = section.startLine + (section.controlLine ?? 0) + 1;
        let status: DeclaredStatus = 'todo';
        if (section.marker !== undefined) {
            const mapped = MARKER_STATUS[section.marker];
            if (!mapped) {
                diagnostics.push({ line, message: `Unknown status marker [${section.marker}]; the section is held as not ready.`, severity: 'error' });
                status = 'not-ready';
            } else status = mapped;
        }
        const metadata = status === 'done' ? { priority: 0, selectors: [] as string[] } : parseControlMetadata(section.controlRest, options.timeZone, diagnostics, line);
        const placeholder = /@@@/.test(section.title) || /@@@/.test(section.description);
        const key = nameKey(section.title);
        if (!key) diagnostics.push({ line, message: 'The task title is empty after normalization.', severity: 'error' });
        tasks.push({
            ref: nameReference(section.title),
            key,
            legacyId: section.legacyId,
            title: section.title,
            description: section.description,
            rules: [],
            source: {
                kind: 'markdown',
                path: options.path,
                relativePath: options.relativePath,
                section: section.index,
                sectionHash: section.hash,
                fileHash,
                order: options.order * 1000 + section.index,
            },
            status,
            doneStamps: status === 'done' ? [/\bdone (\d{4}-\d{2}-\d{2}T\S+)/.exec(section.controlRest)?.[1] ?? 'unknown'] : [],
            priority: { value: metadata.priority, raw: metadata.priority ? '!'.repeat(metadata.priority) : undefined, resolved: true },
            after: 'after' in metadata ? metadata.after : undefined,
            afterRaw: 'afterRaw' in metadata ? metadata.afterRaw : undefined,
            dependsOn: [],
            routing: { model: UNCONSTRAINED, runners: metadata.selectors },
            notes: [],
            placeholder,
            diagnostics,
            text: section.lines.filter((_, lineIndex) => lineIndex !== section.idLine).join('\n').trim(),
        });
    }
    return tasks;
}

/**
 * Locator of a Markdown task section: its revision hash (the section number alone is never identity).
 *
 * @private Markdown tasks
 */
export type SectionLocator = { readonly hash?: string };

/**
 * Finds the one section matching a locator, refusing moved, disappeared or duplicated sections.
 */
function locateSection(source: string, locator: SectionLocator): MarkdownSection {
    const sections = splitMarkdownSections(source);
    const matches = sections.filter((section) => section.hash === locator.hash);
    if (matches.length !== 1) {
        throw new PtbkError(matches.length ? 'The Markdown task section is duplicated.' : 'The Markdown task section moved or disappeared.', {
            kind: 'conflict',
            reason: 'The section content changed concurrently, so the result cannot be attached safely.',
            next: ['Inspect the task file and use `ptbk recover` to resolve the completed work.'],
        });
    }
    return matches[0]!;
}

/**
 * Rewrites the control line of the section identified by its revision hash.
 *
 * The section is located by identity (not by its number) so that a result is never attached to the wrong task.
 *
 * @private Markdown tasks
 */
export function setMarkdownControl(source: string, locator: SectionLocator, marker: string, annotation: string): string {
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const section = locateSection(source, locator);
    const lines = source.split(/\r?\n/);
    const control = `[${marker}]${annotation ? ` ${annotation}` : ''}`;
    if (section.controlLine !== undefined) {
        lines[section.startLine + section.controlLine] = control;
    } else {
        const titleAbsolute = section.startLine + (section.titleLine ?? 0);
        lines.splice(titleAbsolute, 0, control, '');
    }
    return lines.join(newline);
}
