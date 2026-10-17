import { matchCommitmentKeyword, type CommitmentDefinition } from './commitments.js';

/**
 * A problem found while reading a Book, with its 1-based line.
 *
 * @private Book language
 */
export type BookDiagnostic = {
    /** 1-based line number (0 when not line-specific). */
    readonly line: number;
    /** Human-readable explanation. */
    readonly message: string;
    /** Errors block use of the document; warnings are informational. */
    readonly severity: 'error' | 'warning';
};

/**
 * One commitment occurrence in a Book.
 *
 * @private Book language
 */
export type BookCommitment = {
    /** Canonical keyword of the commitment (alias resolved). */
    readonly keyword: string;
    /** Keyword spelling written in the source. */
    readonly written: string;
    /** Definition of the commitment. */
    readonly definition: CommitmentDefinition;
    /** Content on the keyword's own line. */
    readonly value: string;
    /** Full content including continuation lines (trimmed). */
    readonly body: string;
    /** Continuation lines only (trimmed). */
    readonly continuation: string;
    /** 0-based index of the keyword line. */
    readonly startLine: number;
    /** 0-based index after the last continuation line. */
    readonly endLine: number;
};

/**
 * The three project entity kinds a Book can define.
 *
 * @private Book language
 */
export type EntityKind = 'agent' | 'task' | 'chat';

/**
 * Options of reading a Book.
 *
 * @private Book language
 */
export type ParseOptions = {
    /** Kind supplied by a conventional location (`agents/`, `tasks/`, `chats/`) when the Book declares no ENTITY. */
    readonly defaultKind?: EntityKind;
};

/**
 * A parsed Book document.
 *
 * @private Book language
 */
export type BookDocument = {
    /** Entity kind (from ENTITY, the legacy `TASK` header or the location), or empty/unclassifiable. */
    readonly kind: EntityKind | 'empty' | 'invalid';
    /** The entity's display name: the first nonempty line (legacy `TASK <title>` names the task <title>). */
    readonly name: string;
    /** The first line uses the legacy `TASK <title>` spelling. */
    readonly legacyTaskHeader: boolean;
    /** Kind declared by an explicit ENTITY commitment. */
    readonly declaredKind?: EntityKind;
    /** 0-based index of the identifying first nonempty line. */
    readonly headerLine: number;
    /** Natural text between the header and the first commitment (trimmed). */
    readonly intro: string;
    /** All natural prose: the intro plus text following one-line controls such as `ENTITY TASK` (trimmed). */
    readonly prose: string;
    /** Commitments in source order. */
    readonly commitments: readonly BookCommitment[];
    /** Problems found while reading. */
    readonly diagnostics: readonly BookDiagnostic[];
    /** Source lines (without line terminators). */
    readonly lines: readonly string[];
    /** Line terminator used by the source. */
    readonly newline: '\n' | '\r\n';
};

/**
 * Detects a fence opener/closer (``` or ~~~).
 */
function fenceMarker(line: string): string | undefined {
    const match = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    return match?.[1];
}

/**
 * Entity kinds by ENTITY value.
 */
const ENTITY_VALUES: Readonly<Record<string, EntityKind>> = { AGENT: 'agent', TASK: 'task', CHAT: 'chat' };

/**
 * Reads a Book source: its name (first nonempty line), entity kind and commitments.
 *
 * The kind comes from an explicit `ENTITY AGENT|TASK|CHAT`, the legacy `TASK <title>` first line, the conventional
 * location (`options.defaultKind`) or, for a legacy agent Book elsewhere, the unprefixed name. Conflicting
 * declarations make the document unclassifiable instead of guessing. Fenced literal content is preserved as text and
 * never interpreted as commitments.
 *
 * @private Book language
 */
export function parseBook(source: string, options: ParseOptions = {}): BookDocument {
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const text = source.startsWith('﻿') ? source.slice(1) : source;
    const lines = text.split(/\r?\n/);
    const diagnostics: BookDiagnostic[] = [];
    const headerLine = lines.findIndex((line) => line.trim() !== '');
    if (headerLine < 0) {
        return { kind: 'empty', name: '', legacyTaskHeader: false, headerLine: -1, intro: '', prose: '', commitments: [], diagnostics, lines, newline };
    }
    const header = lines[headerLine]!.trim();
    let invalid = false;
    let legacyTaskHeader = false;
    let name: string;
    const headerMatch = matchCommitmentKeyword(header);
    if (headerMatch && headerMatch.definition.keyword === 'TASK') {
        legacyTaskHeader = true;
        name = headerMatch.content;
        if (!name) {
            invalid = true;
            diagnostics.push({ line: headerLine + 1, message: 'A task needs a nonempty name after the legacy `TASK` header.', severity: 'error' });
        }
    } else if (headerMatch) {
        invalid = true;
        name = '';
        diagnostics.push({ line: headerLine + 1, message: `\`${headerMatch.written}\` cannot start a Book; the first nonempty line is the entity's name.`, severity: 'error' });
    } else {
        name = header;
    }

    const commitments: BookCommitment[] = [];
    const introLines: string[] = [];
    let current: { match: NonNullable<ReturnType<typeof matchCommitmentKeyword>>; start: number; continuation: string[] } | undefined;
    let fence: string | undefined;
    const close = (end: number): void => {
        if (!current) return;
        const continuation = current.continuation.join('\n').trim();
        const body = [current.match.content, ...current.continuation].join('\n').trim();
        commitments.push({
            keyword: current.match.definition.keyword,
            written: current.match.written,
            definition: current.match.definition,
            value: current.match.content,
            body,
            continuation,
            startLine: current.start,
            endLine: end,
        });
        current = undefined;
    };
    for (let index = headerLine + 1; index < lines.length; index++) {
        const line = lines[index]!;
        const marker = fenceMarker(line);
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = undefined;
        } else if (marker) {
            fence = marker;
        } else {
            const match = matchCommitmentKeyword(line);
            if (match) {
                close(index);
                current = { match, start: index, continuation: [] };
                if (match.definition.keyword === 'TASK') {
                    diagnostics.push({
                        line: index + 1,
                        message: 'A later `TASK` line does not declare another task; only the first nonempty line identifies the document.',
                        severity: 'warning',
                    });
                }
                continue;
            }
        }
        if (current) current.continuation.push(line);
        else introLines.push(line);
    }
    close(lines.length);
    if (fence) diagnostics.push({ line: lines.length, message: 'An unterminated fenced block runs to the end of the document.', severity: 'warning' });

    // Entity kind: explicit ENTITY, legacy TASK header, conventional location, legacy agent Book.
    const entities = commitments.filter((commitment) => commitment.keyword === 'ENTITY');
    const declared = [...new Set(entities.map((commitment) => commitment.value.trim().toUpperCase()))];
    let declaredKind: EntityKind | undefined;
    if (declared.length > 1) {
        invalid = true;
        diagnostics.push({ line: entities[1]!.startLine + 1, message: `Conflicting ENTITY declarations (${declared.join(', ')}).`, severity: 'error' });
    } else if (declared.length === 1) {
        declaredKind = ENTITY_VALUES[declared[0]!];
        if (!declaredKind) {
            invalid = true;
            diagnostics.push({ line: entities[0]!.startLine + 1, message: `ENTITY must be AGENT, TASK or CHAT, not "${entities[0]!.value}".`, severity: 'error' });
        }
    }
    let kind: EntityKind | undefined = declaredKind ?? (legacyTaskHeader ? 'task' : undefined);
    if (declaredKind && legacyTaskHeader && declaredKind !== 'task') {
        invalid = true;
        diagnostics.push({ line: headerLine + 1, message: `The legacy \`TASK\` header conflicts with ENTITY ${declaredKind.toUpperCase()}.`, severity: 'error' });
    }
    if (kind && options.defaultKind && kind !== options.defaultKind) {
        invalid = true;
        diagnostics.push({ line: headerLine + 1, message: `This Book declares a ${kind}, but its location holds ${options.defaultKind}s; add the matching ENTITY or move the file.`, severity: 'error' });
    }
    kind ??= options.defaultKind ?? 'agent';
    for (const commitment of commitments) {
        const scope = commitment.definition.scope;
        if (scope === 'any' || scope === kind || (scope === 'both' && kind !== 'chat')) continue;
        diagnostics.push({ line: commitment.startLine + 1, message: `\`${commitment.written}\` is a${scope === 'agent' ? 'n agent' : scope === 'task' ? ' task' : scope === 'chat' ? ' chat' : 'n agent/task'} commitment and has no meaning in a ${kind}.`, severity: 'warning' });
    }
    const intro = introLines.join('\n').trim();
    // One-line controls end at their line: text below them is ordinary prose of the document.
    const prose = [intro, ...commitments.filter((commitment) => commitment.definition.kind !== 'instruction' && commitment.continuation).map((commitment) => commitment.continuation)]
        .filter(Boolean)
        .join('\n\n');
    return { kind: invalid ? 'invalid' : kind, name, legacyTaskHeader, declaredKind, headerLine, intro, prose, commitments, diagnostics, lines, newline };
}

/**
 * Returns all commitments of a canonical keyword.
 *
 * @private Book language
 */
export function commitmentsOf(document: BookDocument, keyword: string): BookCommitment[] {
    return document.commitments.filter((commitment) => commitment.keyword === keyword);
}

/**
 * Returns the single effective value of a control commitment, reporting conflicting duplicates.
 *
 * @private Book language
 */
export function singleValue(document: BookDocument, keyword: string): { value?: string; commitment?: BookCommitment; conflict?: BookDiagnostic } {
    const found = commitmentsOf(document, keyword);
    if (found.length === 0) return {};
    const distinct = new Set(found.map((commitment) => commitment.value));
    if (distinct.size > 1) {
        return {
            value: found[0]!.value,
            commitment: found[0],
            conflict: {
                line: found[1]!.startLine + 1,
                message: `\`${keyword}\` has conflicting values (${[...distinct].map((value) => `"${value}"`).join(', ')}).`,
                severity: 'error',
            },
        };
    }
    return { value: found[0]!.value, commitment: found[0] };
}
