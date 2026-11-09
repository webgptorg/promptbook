import assert from 'node:assert/strict';
import { test } from 'node:test';
import language from '../../../dist-vscode/test/language.cjs';
import { completionItems, diagnosticMarkers, occurrenceRanges, positionAt, referenceAtOffset, referenceRanges, tokenRanges } from '../../../apps/desktop/editor/book-monaco.mjs';
import { activateEditor, bookDocument } from './editor.mjs';

/**
 * The desktop Monaco adapter and this extension are two thin adapters of the same Book language services: on the same
 * text they must produce the same tokens, diagnostics and reference ranges (Monaco is 1-based, VS Code 0-based).
 */
const unicode = 'AGENT Čeněk Novák\nGOAL Ask 👋 @Writer and {Žofia Dvořáková} about {Čeněk Novák}.\nRULE Keep 日本語 and @Writer short.\nNOTE `@Code` stays literal; mail@Writer is no reference.\n```\n{Writer}\n```\nUNKNOWN THING here';
const samples = {
    unicode,
    crlf: unicode.replace(/\n/g, '\r\n'),
    long: `AGENT Long\n${Array.from({ length: 4000 }, (_, index) => `${index % 3 ? 'GOAL' : 'RULE'} Line ${index} mentions @Agent${index % 17} and {Ž ${index % 5}}.`).join('\n')}`,
};

/** A VS Code range as the Monaco range of the same characters. */
const monacoRange = (range) => ({ startLineNumber: range.start.line + 1, startColumn: range.start.character + 1, endLineNumber: range.end.line + 1, endColumn: range.end.character + 1 });
/** Only the range of a Monaco range-like object. */
const rangeOnly = ({ startLineNumber, startColumn, endLineNumber, endColumn }) => ({ startLineNumber, startColumn, endLineNumber, endColumn });

for (const [name, text] of Object.entries(samples)) {
    test(`Monaco and VS Code agree on Book tokens, diagnostics and references (${name})`, () => {
        const document = bookDocument(`/project/agents/${name}.book`, text);
        const editor = activateEditor([document]);
        const types = { declaration: 0, name: 1, keyword: 0, unknown: 4, reference: 2, literal: 3 };
        const vscodeTokens = editor.tokens.provideDocumentSemanticTokens(document).map((span) => `${span.line}:${span.start}:${span.length}:${span.type}`);
        const monacoTokens = tokenRanges(language, text).map((span) => `${span.startLineNumber - 1}:${span.startColumn - 1}:${span.endColumn - span.startColumn}:${types[span.kind]}`);
        assert.deepEqual(monacoTokens, vscodeTokens);

        const markers = diagnosticMarkers(language, text);
        assert.deepEqual(markers.map((marker) => [marker.startLineNumber, marker.message]), language.analyze(text).diagnostics.map((problem) => [problem.line, problem.message]));
        if (name !== 'long') assert.ok(markers.some((marker) => /UNKNOWN|unknown/.test(marker.message)), 'the unknown commitment is reported');

        for (const reference of referenceRanges(language, text).slice(0, 60)) {
            const start = document.offsetAt({ line: reference.startLineNumber - 1, character: reference.startColumn - 1 });
            assert.equal(text.slice(start, start + reference.raw.length), reference.raw, 'the range covers the written reference');
            for (const offset of [start, start + reference.raw.length - 1]) {
                const highlights = editor.highlights.provideDocumentHighlights(document, document.positionAt(offset));
                assert.deepEqual(occurrenceRanges(language, text, offset).map(rangeOnly), Array.from(highlights, (item) => monacoRange(item.range)));
                assert.deepEqual(rangeOnly(referenceAtOffset(language, text, offset)), rangeOnly(reference));
            }
        }
        editor.dispose();
    });
}

test('Monaco positions keep UTF-16, CRLF and astral offsets of the original text', () => {
    const text = 'A👋\r\nb{Ž}';
    assert.deepEqual(positionAt(text, 0), { lineNumber: 1, column: 1 });
    assert.deepEqual(positionAt(text, 3), { lineNumber: 1, column: 4 });
    assert.deepEqual(positionAt(text, 5), { lineNumber: 2, column: 1 });
    assert.deepEqual(positionAt(text, text.indexOf('{')), { lineNumber: 2, column: 2 });
});

test('Monaco completions use the shared commitment vocabulary and replace the typed prefix', () => {
    const items = completionItems(language, 'AGENT Writer\nWRITING R', 2, 10);
    assert.ok(items.some((item) => item.label === 'WRITING RULES' && item.insertText === 'WRITING RULES '));
    assert.deepEqual(items[0].range, { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 10 });
    assert.deepEqual(completionItems(language, 'AGENT Writer\n```\nRULE', 3, 5), []);
});
