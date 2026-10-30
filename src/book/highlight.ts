import { matchCommitmentKeyword } from './commitments.js';
import { fenceMarker, parseBook } from './parse.js';
import { findAgentReferences } from './references.js';

/**
 * What a highlighted range of a Book is: the opening declaration keyword and entity name, a commitment keyword (an
 * unknown complete keyword separately), a reference in content, or literal (fenced) content.
 *
 * @private Book language
 */
export type BookHighlightKind = 'declaration' | 'name' | 'keyword' | 'unknown' | 'reference' | 'literal';

/**
 * One highlighted range: a 0-based line and the UTF-16 column range within that line. The source itself is never
 * changed; ranges only describe it.
 *
 * @private Book language
 */
export type BookHighlightSpan = {
    readonly line: number;
    readonly start: number;
    readonly end: number;
    readonly kind: BookHighlightKind;
};

/**
 * Syntax highlighting of a Book from the one Book parser: the first-line `AGENT|TASK|CHAT` declaration and its name,
 * every commitment keyword (new ones such as `TASK PURPOSE` included through the common commitment knowledge),
 * references in content and fenced literal blocks. Escaped and fenced lines are literal, so control-looking text
 * inside them is never a keyword. Every viewer and editor (terminal and browser, read-only and editable) uses these
 * same ranges instead of its own grammar.
 *
 * @private Book language
 */
export function highlightBook(source: string): BookHighlightSpan[] {
    const document = parseBook(source);
    const spans: BookHighlightSpan[] = [];
    if (document.headerLine < 0) return spans;
    const keywordLines = new Set(document.commitments.map((commitment) => commitment.startLine));
    const header = document.lines[document.headerLine]!;
    const opening = matchCommitmentKeyword(header);
    if (opening && opening.definition.kind === 'declaration') {
        spans.push({ line: document.headerLine, start: 0, end: opening.written.length, kind: 'declaration' });
        const nameStart = header.indexOf(opening.content, opening.written.length);
        if (opening.content && nameStart >= 0) spans.push({ line: document.headerLine, start: nameStart, end: nameStart + opening.content.length, kind: 'name' });
    }
    for (const commitment of document.commitments) {
        spans.push({ line: commitment.startLine, start: 0, end: commitment.written.length, kind: commitment.definition.unknown ? 'unknown' : commitment.definition.kind === 'declaration' ? 'declaration' : 'keyword' });
    }
    // Fenced blocks are literal; references are found only in the remaining (nonliteral) content.
    let fence: string | undefined;
    for (let index = document.headerLine + 1; index < document.lines.length; index++) {
        const line = document.lines[index]!;
        const marker = fenceMarker(line);
        if (fence || marker) {
            if (line.length) spans.push({ line: index, start: 0, end: line.length, kind: 'literal' });
            if (fence) {
                if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = undefined;
            } else fence = marker;
            continue;
        }
        const offset = keywordLines.has(index) ? (document.commitments.find((commitment) => commitment.startLine === index)?.written.length ?? 0) : 0;
        const content = line.slice(offset);
        for (const reference of findAgentReferences(content)) spans.push({ line: index, start: offset + reference.index, end: offset + reference.index + reference.raw.length, kind: 'reference' });
    }
    return spans.sort((a, b) => a.line - b.line || a.start - b.start);
}

/**
 * The highlight kind of every UTF-16 offset of the source (`undefined` for plain text), for renderers that walk the
 * text character by character such as the terminal editor.
 *
 * @private Book language
 */
export function highlightKinds(source: string): (BookHighlightKind | undefined)[] {
    const kinds: (BookHighlightKind | undefined)[] = new Array(source.length).fill(undefined);
    const starts: number[] = [];
    let position = 0;
    for (const line of source.split('\n')) {
        starts.push(position);
        position += line.length + 1;
    }
    for (const span of highlightBook(source)) {
        const base = starts[span.line];
        if (base === undefined) continue;
        for (let offset = base + span.start; offset < base + span.end && offset < kinds.length; offset++) kinds[offset] = span.kind;
    }
    return kinds;
}
