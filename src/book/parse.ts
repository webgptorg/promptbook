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
 * A parsed Book document.
 *
 * @private Book language
 */
export type BookDocument = {
    /** Agent (name on first line), task (`TASK <title>`), empty or invalid document. */
    readonly kind: 'agent' | 'task' | 'empty' | 'invalid';
    /** Agent name or task title. */
    readonly name: string;
    /** 0-based index of the identifying first nonempty line. */
    readonly headerLine: number;
    /** Natural text between the header and the first commitment (trimmed). */
    readonly intro: string;
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
 * Reads a Book source: identifies the document kind and its commitments.
 *
 * Fenced literal content is preserved as text and never interpreted as commitments.
 *
 * @private Book language
 */
export function parseBook(source: string): BookDocument {
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const text = source.startsWith('﻿') ? source.slice(1) : source;
    const lines = text.split(/\r?\n/);
    const diagnostics: BookDiagnostic[] = [];
    const headerLine = lines.findIndex((line) => line.trim() !== '');
    if (headerLine < 0) {
        return { kind: 'empty', name: '', headerLine: -1, intro: '', commitments: [], diagnostics, lines, newline };
    }
    const header = lines[headerLine]!.trim();
    let kind: BookDocument['kind'];
    let name: string;
    const headerMatch = matchCommitmentKeyword(header);
    if (headerMatch && headerMatch.definition.keyword === 'TASK') {
        kind = 'task';
        name = headerMatch.content;
        if (!name) {
            kind = 'invalid';
            diagnostics.push({ line: headerLine + 1, message: 'A task needs a nonempty title after `TASK`.', severity: 'error' });
        }
    } else if (headerMatch && headerMatch.definition.scope !== 'agent' && headerMatch.definition.keyword.startsWith('TASK')) {
        kind = 'invalid';
        name = '';
        diagnostics.push({ line: headerLine + 1, message: `\`${headerMatch.written}\` cannot start a Book; a task starts with \`TASK <title>\`.`, severity: 'error' });
    } else {
        kind = 'agent';
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

    for (const commitment of commitments) {
        const scope = commitment.definition.scope;
        if (kind === 'task' && scope === 'agent') {
            diagnostics.push({ line: commitment.startLine + 1, message: `\`${commitment.written}\` is an agent commitment and has no meaning in a task.`, severity: 'warning' });
        }
        if (kind === 'agent' && scope === 'task') {
            diagnostics.push({ line: commitment.startLine + 1, message: `\`${commitment.written}\` is a task commitment and has no meaning in an agent.`, severity: 'warning' });
        }
    }
    return { kind, name, headerLine, intro: introLines.join('\n').trim(), commitments, diagnostics, lines, newline };
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
