import { commitmentKeywords, matchCommitmentKeyword } from '../../../src/book/commitments.js';
import { modelOfDocument } from '../../../src/book/model.js';
import { fenceMarker, parseBook } from '../../../src/book/parse.js';
import { findAgentReferences } from '../../../src/book/references.js';

export { commitmentKeywords, matchCommitmentKeyword, parseBook };
export { highlightBook } from '../../../src/book/highlight.js';

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
