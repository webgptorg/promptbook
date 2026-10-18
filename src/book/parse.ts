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
    /** Canonical keyword of the commitment (alias resolved; the complete written keyword when unknown). */
    readonly keyword: string;
    /** Keyword spelling written in the source. */
    readonly written: string;
    /** Definition of the commitment (`unknown` for undocumented keywords). */
    readonly definition: CommitmentDefinition;
    /** Content on the keyword's own line. */
    readonly value: string;
    /** Full content including continuation lines (trimmed; escaped literal lines unescaped). */
    readonly body: string;
    /** Continuation lines only (trimmed; escaped literal lines unescaped). */
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
 * Details of a source written in a former syntax (plain name line, `ENTITY`, introduction text), recorded only to
 * diagnose it and to prepare an explicitly requested conversion; it never makes the source a valid Book.
 *
 * @private Book language
 */
export type LegacySource = {
    /** The first line is a plain name instead of an `AGENT|TASK|CHAT <name>` declaration. */
    readonly plainHeader: boolean;
    /** Kind stated by historical `ENTITY` lines (`conflict` when they disagree, `unsupported` for another value). */
    readonly entity?: EntityKind | 'conflict' | 'unsupported';
    /** The name starts with an all-uppercase word, so it cannot follow a keyword without a spelling decision. */
    readonly uppercaseName?: boolean;
    /** Text between the opening line and the first commitment (a former introduction), as 0-based line range. */
    readonly introduction?: { readonly start: number; readonly end: number; readonly text: string };
};

/**
 * A parsed Book document.
 *
 * @private Book language
 */
export type BookDocument = {
    /** Entity kind declared by the opening commitment; `invalid` without a valid declaration, `empty` for no text. */
    readonly kind: EntityKind | 'empty' | 'invalid';
    /** The entity's display name: the content of the opening declaration (or a legacy plain name line). */
    readonly name: string;
    /** Kind declared by the opening `AGENT`, `TASK` or `CHAT` commitment. */
    readonly declaredKind?: EntityKind;
    /** Former syntax found in the source (diagnosed; converted only by `ptbk migrate`). */
    readonly legacy?: LegacySource;
    /** 0-based index of the opening line. */
    readonly headerLine: number;
    /** Commitments after the opening declaration, in source order. */
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
 *
 * @private Book language
 */
export function fenceMarker(line: string): string | undefined {
    const match = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    return match?.[1];
}

/**
 * Entity kinds by declaration keyword (and former ENTITY value).
 */
const KIND_BY_KEYWORD: Readonly<Record<string, EntityKind>> = { AGENT: 'agent', TASK: 'task', CHAT: 'chat' };

/**
 * Removes the literal escape (one leading backslash) of a content line outside fenced blocks.
 */
function unescapeLine(line: string): string {
    return line.startsWith('\\') ? line.slice(1) : line;
}

/**
 * Human label of a commitment scope.
 */
function scopeLabel(scope: CommitmentDefinition['scope']): string {
    return scope === 'agent' ? 'an agent' : scope === 'task' ? 'a task' : scope === 'chat' ? 'a chat' : 'an agent/task';
}

/**
 * Reads a Book: the opening `AGENT <name>`, `TASK <name>` or `CHAT <name>` declaration and the commitments after it.
 *
 * One grammar for every kind: a commitment starts at column zero with a complete uppercase keyword (at least three
 * letters); its content continues until the next commitment. The location of the file never supplies the kind. Fenced
 * blocks and lines escaped with a leading backslash are literal content. Former syntax (a plain name line, `ENTITY`,
 * an introduction under the name) is diagnosed and recorded for explicit conversion, never silently accepted.
 *
 * @private Book language
 */
export function parseBook(source: string): BookDocument {
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const text = source.startsWith('﻿') ? source.slice(1) : source;
    const lines = text.split(/\r?\n/);
    const diagnostics: BookDiagnostic[] = [];
    const headerLine = lines.findIndex((line) => line.trim() !== '');
    if (headerLine < 0) return { kind: 'empty', name: '', headerLine: -1, commitments: [], diagnostics, lines, newline };

    // Commitments after the opening line (fenced and escaped lines are content).
    const commitments: BookCommitment[] = [];
    const introduction: number[] = [];
    let current: { match: NonNullable<ReturnType<typeof matchCommitmentKeyword>>; start: number; continuation: string[] } | undefined;
    let fence: string | undefined;
    const close = (end: number): void => {
        if (!current) return;
        const continuation = current.continuation.join('\n').trim();
        commitments.push({
            keyword: current.match.definition.keyword,
            written: current.match.written,
            definition: current.match.definition,
            value: current.match.content,
            body: [current.match.content, ...current.continuation].join('\n').trim(),
            continuation,
            startLine: current.start,
            endLine: end,
        });
        current = undefined;
    };
    for (let index = headerLine + 1; index < lines.length; index++) {
        const line = lines[index]!;
        const marker = fenceMarker(line);
        let content = line;
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = undefined;
        } else if (marker) {
            fence = marker;
        } else {
            const match = matchCommitmentKeyword(line);
            if (match) {
                close(index);
                current = { match, start: index, continuation: [] };
                continue;
            }
            content = unescapeLine(line);
        }
        if (current) current.continuation.push(content);
        else introduction.push(index);
    }
    close(lines.length);
    if (fence) diagnostics.push({ line: lines.length, message: 'An unterminated fenced block runs to the end of the document.', severity: 'warning' });

    // The opening declaration.
    const header = lines[headerLine]!;
    const opening = matchCommitmentKeyword(header);
    let declaredKind: EntityKind | undefined;
    let name = '';
    let plainHeader = false;
    let uppercaseName = false;
    if (opening?.definition.kind === 'declaration') {
        declaredKind = KIND_BY_KEYWORD[opening.definition.keyword];
        name = opening.content;
        if (!name) diagnostics.push({ line: headerLine + 1, message: `\`${opening.written}\` needs the entity's name on the same line, e.g. \`${opening.written} Improve CSV export\`.`, severity: 'error' });
    } else if (opening?.definition.unknown && /^(AGENT|TASK|CHAT) /.test(opening.written)) {
        // `TASK API cleanup`: the name's first word joins the keyword under the boundary rule.
        const [keyword, ...rest] = opening.written.split(/\s+/);
        name = [...rest, opening.content].filter(Boolean).join(' ');
        uppercaseName = true;
        diagnostics.push({
            line: headerLine + 1,
            message: `\`${opening.written}\` is not a declaration: the name's first word must not be all uppercase (for example \`${keyword} ${rest[0]![0]}${rest[0]!.slice(1).toLowerCase()}${name.slice(rest[0]!.length)}\`).`,
            severity: 'error',
        });
    } else if (opening && !opening.definition.unknown) {
        diagnostics.push({ line: headerLine + 1, message: `A Book must start with \`AGENT <name>\`, \`TASK <name>\` or \`CHAT <name>\`, not \`${opening.written}\`.`, severity: 'error' });
    } else {
        // A plain first line: the former unprefixed name header (an all-uppercase name reads as an unknown keyword).
        plainHeader = true;
        uppercaseName = Boolean(opening);
        name = header.trim();
    }
    if (/^\s/.test(header) && !plainHeader) diagnostics.push({ line: headerLine + 1, message: 'The opening declaration must start at the beginning of the line.', severity: 'error' });

    // Text under the opening line belongs to the name declaration, which is a single line.
    const introductionLines = introduction.filter((index) => lines[index]!.trim() !== '');
    const introductionText = introduction.length ? introduction.map((index) => unescapeLine(lines[index]!)).join('\n').trim() : '';
    if (introductionLines.length && !plainHeader && declaredKind) {
        diagnostics.push({
            line: introductionLines[0]! + 1,
            message: `The ${declaredKind} name is a single line; put this text under a commitment such as ${declaredKind === 'task' ? 'GOAL' : declaredKind === 'agent' ? 'PERSONA, GOAL or NOTE' : 'NOTE'} (\`ptbk migrate\` converts it).`,
            severity: 'error',
        });
    }

    // Historical ENTITY lines and further declarations.
    const entities = commitments.filter((commitment) => commitment.keyword === 'ENTITY');
    // `ENTITY TASK` reads as one complete keyword; its second word is the former kind.
    const entityValues = [...new Set(entities.map((commitment) => (commitment.written.split(/\s+/)[1] ?? commitment.value).trim().toUpperCase()))];
    const entity: LegacySource['entity'] = entityValues.length > 1 ? 'conflict' : entityValues.length ? (KIND_BY_KEYWORD[entityValues[0]!] ?? 'unsupported') : undefined;
    if (entities.length && declaredKind) {
        const contradicts = entity !== declaredKind;
        diagnostics.push({
            line: entities[0]!.startLine + 1,
            message: contradicts ? `ENTITY ${entities[0]!.value} contradicts the opening \`${opening!.written}\` declaration and cannot override it.` : 'ENTITY is former syntax; the opening declaration already states the kind (remove this line).',
            severity: contradicts ? 'error' : 'warning',
        });
    }
    for (const commitment of commitments) {
        if (commitment.definition.kind === 'declaration') {
            diagnostics.push({ line: commitment.startLine + 1, message: `A Book defines exactly one entity; this second \`${commitment.written}\` declaration is invalid.`, severity: 'error' });
        }
    }

    const legacyPresent = plainHeader || uppercaseName || entities.length > 0 || (introductionLines.length > 0 && Boolean(declaredKind));
    const legacy: LegacySource | undefined = legacyPresent
        ? {
              plainHeader,
              entity,
              uppercaseName: uppercaseName || undefined,
              introduction: introductionLines.length ? { start: introduction[0]!, end: introduction[introduction.length - 1]! + 1, text: introductionText } : undefined,
          }
        : undefined;
    if (plainHeader) {
        diagnostics.push({
            line: headerLine + 1,
            message: `"${name}" starts with a plain name line (former syntax). Canonical Books start with \`AGENT <name>\`, \`TASK <name>\` or \`CHAT <name>\`; convert it explicitly with \`ptbk migrate\`.`,
            severity: 'error',
        });
    }

    const kind = declaredKind && name ? declaredKind : undefined;
    for (const commitment of commitments) {
        if (commitment.definition.kind === 'declaration' || commitment.keyword === 'ENTITY') continue;
        const singleLine = commitment.definition.kind === 'control' || commitment.definition.kind === 'repeatable-control' || commitment.definition.kind === 'flag';
        if (singleLine && commitment.continuation && kind) {
            diagnostics.push({
                line: commitment.startLine + 2,
                message: `\`${commitment.written}\` takes single-line content; the text below it belongs to no instruction (put it under a commitment such as ${kind === 'task' ? 'GOAL' : kind === 'agent' ? 'PERSONA or NOTE' : 'NOTE'}).`,
                severity: 'warning',
            });
        }
        if (commitment.definition.unknown) {
            diagnostics.push({ line: commitment.startLine + 1, message: `Unknown commitment \`${commitment.written}\`; it is preserved but has no effect.`, severity: 'warning' });
            continue;
        }
        if (!kind) continue;
        const scope = commitment.definition.scope;
        if (scope === 'any' || scope === kind || (scope === 'both' && kind !== 'chat')) continue;
        diagnostics.push({ line: commitment.startLine + 1, message: `\`${commitment.written}\` is ${scopeLabel(scope)} commitment and has no meaning in a ${kind}.`, severity: 'warning' });
    }
    return { kind: kind ?? 'invalid', name, declaredKind, legacy, headerLine, commitments, diagnostics, lines, newline };
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
