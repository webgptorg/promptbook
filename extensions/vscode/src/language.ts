import { commitmentKeywords, matchCommitmentKeyword } from '../../../src/book/commitments.js';
import { modelOfDocument } from '../../../src/book/model.js';
import { fenceMarker, parseBook } from '../../../src/book/parse.js';
import { highlightBook as engineHighlightBook } from '../../../src/book/highlight.js';
import { findAgentReferences, normalizeAgentName, type AgentReference } from '../../../src/book/references.js';

export { commitmentKeywords, matchCommitmentKeyword, parseBook };

/** Analyze editor text with the same syntax and MODEL checks as the engine, without executing anything. */
export function analyze(source: string) {
    const document = parseBook(source);
    const diagnostics = [
        ...document.diagnostics,
        ...modelOfDocument(document, { multiple: document.kind === 'chat' ? 'last' : 'error' }).diagnostics,
    ];
    return { document, diagnostics };
}

/** Whether a line is fenced or escaped literal content under the Book parser's fence rules. */
export function isLiteral(source: string, line: number): boolean {
    let fence: string | undefined;
    const lines = source.split(/\r?\n/);
    for (let index = 0; index <= line; index++) {
        const text = lines[index] ?? '';
        const marker = fenceMarker(text);
        if (index === line) return Boolean(fence || marker || text.startsWith('\\'));
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length && text.trim() === marker) fence = undefined;
        } else if (marker) fence = marker;
    }
    return false;
}

/** Complete only whole commitments applicable to the declared entity and the current column-zero prefix. */
export function keywordCompletions(source: string, line: number, character: number) {
    const prefix = (source.split(/\r?\n/)[line] ?? '').slice(0, character).replace(/^\uFEFF/, '');
    if (isLiteral(source, line) || !/^[\p{Lu}\p{M} \t]*$/u.test(prefix) || /^[ \t]/.test(prefix)) return [];
    const document = parseBook(source);
    const opening = document.headerLine < 0 || line <= document.headerLine;
    return commitmentKeywords().flatMap((keyword) => {
        const definition = matchCommitmentKeyword(keyword)!.definition;
        const applicable = definition.scope === 'any' || definition.scope === document.kind
            || (definition.scope === 'both' && ['agent', 'task'].includes(document.kind));
        if (definition.kind === 'historical'
            || (opening ? definition.kind !== 'declaration' : definition.kind === 'declaration' || !applicable)) return [];
        return keyword.startsWith(prefix.replace(/\s+/g, ' ')) ? [{ keyword, definition }] : [];
    });
}

/** Reference offsets in original editor text, excluding declarations, escaped lines and code. */
export function referencesIn(source: string) {
    const document = parseBook(source);
    // Retain every UTF-16 offset, including CRLF, so TextDocument.offsetAt agrees with the engine's scanner.
    const masked = source.split('\n').map((line, index) => {
        if (index <= document.headerLine || line.startsWith('\\')) return ' '.repeat(line.length);
        const match = matchCommitmentKeyword(line);
        return match ? ' '.repeat(match.written.length) + line.slice(match.written.length) : line;
    });
    return findAgentReferences(masked.join('\n'));
}

/** The declared entity name, with offsets in the original editor text (including a possible BOM and CRLF). */
export function declarationIn(source: string): AgentReference | undefined {
    const document = parseBook(source);
    if (!['agent', 'task', 'chat'].includes(document.kind) || !document.name) return;
    const lines = source.split('\n');
    const line = lines[document.headerLine]!;
    const opening = matchCommitmentKeyword(line.replace(/^\uFEFF/, ''))!;
    const start = line.indexOf(document.name, opening.written.length);
    const index = lines.slice(0, document.headerLine).reduce((length, text) => length + text.length + 1, 0) + start;
    return { raw: document.name, name: document.name, normalized: normalizeAgentName(document.name), index };
}

/** The complete reference under the cursor; punctuation, code and escaped text never become navigation links. */
export function referenceAt(source: string, offset: number): AgentReference | undefined {
    return referencesIn(source).find((item) => offset >= item.index && offset < item.index + item.raw.length);
}

/** All uses of the selected name in this document, regardless of @/brace spelling, plus its local declaration. */
export function referenceHighlights(source: string, offset: number) {
    const references = referencesIn(source);
    const declaration = declarationIn(source);
    const selected = [...references, ...(declaration ? [declaration] : [])]
        .find((item) => offset >= item.index && offset < item.index + item.raw.length);
    if (!selected) return [];
    return [
        ...references.filter((item) => item.normalized === selected.normalized).map((item) => ({ ...item, declaration: false })),
        ...(declaration?.normalized === selected.normalized ? [{ ...declaration, declaration: true }] : []),
    ].sort((a, b) => a.index - b.index);
}

/** Shared engine token ranges with the exact reference ranges used by navigation and occurrence highlighting. */
export function highlightBook(source: string) {
    const spans = engineHighlightBook(source).filter((span) => span.kind !== 'reference')
        .map((span) => source.startsWith('\uFEFF') && span.line === 0
            ? { ...span, start: span.start + 1, end: span.end + 1 } : span);
    const starts = [0];
    for (let index = 0; index < source.length; index++) if (source[index] === '\n') starts.push(index + 1);
    let line = 0;
    for (const reference of referencesIn(source)) {
        while (line + 1 < starts.length && starts[line + 1]! <= reference.index) line++;
        const start = reference.index - starts[line]!;
        spans.push({ line, start, end: start + reference.raw.length, kind: 'reference' });
    }
    return spans.sort((a, b) => a.line - b.line || a.start - b.start);
}
