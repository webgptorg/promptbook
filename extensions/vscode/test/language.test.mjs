import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import language from '../../../dist-vscode/test/language.cjs';
import bookc from '../../../dist-vscode/test/bookc.cjs';

test('the extension uses current typed declarations and engine syntax/MODEL diagnostics', () => {
    assert.equal(language.analyze('AGENT Writer\nWRITING RULE Keep it short.').diagnostics.length, 0);
    assert.equal(language.analyze('TASK Improve export\nTASK PURPOSE CONTENT').diagnostics.length, 0);
    assert.equal(language.analyze('CHAT Discussion\nCHAT MEMBER @User').document.kind, 'chat');
    assert.ok(language.analyze('Writer\nENTITY AGENT').diagnostics.some((item) => item.severity === 'error'));
    assert.ok(language.analyze('AGENT Writer\nMODEL thinking=impossible').diagnostics.some((item) => /thinking/i.test(item.message)));
    assert.ok(language.analyze('TASK Test\nTASK SOMETHING unknown').diagnostics.some((item) => /unknown/i.test(item.message)));
});

test('completion follows scope, aliases and complete uppercase keyword boundaries', () => {
    const complete = (source, line, column) => language.keywordCompletions(source, line, column).map((item) => item.keyword);
    assert.deepEqual(complete('', 0, 0).sort(), ['AGENT', 'CHAT', 'TASK']);
    assert.ok(complete('AGENT Writer\nWRITING R', 1, 9).includes('WRITING RULES'));
    assert.ok(complete('TASK Do it\nTASK P', 1, 6).includes('TASK PURPOSE CONTENT'));
    assert.ok(!complete('TASK Do it\n', 1, 0).includes('PERSONA'));
    assert.deepEqual(complete('AGENT Writer\n  WR', 1, 4), []);
    assert.deepEqual(complete('AGENT Writer\nRULE prose', 1, 10), []);
    assert.deepEqual(complete('AGENT Writer\nSAMPLE Example\n```book\nRULE', 3, 4), []);
    assert.deepEqual(complete('AGENT Writer\n\\RULE', 1, 5), []);
    assert.ok(complete('AGENT Writer\nDELETE WRITING ', 1, 15).includes('DELETE WRITING RULES'));
});

test('reference navigation retains exact CRLF/UTF-16 offsets and skips emails, code, escapes and double braces', () => {
    const source = 'AGENT Writer\r\nGOAL 👋 Ask {Čeněk Novák}, @Designer. me@example.com {{Template}} `@Inline`\r\n```book\r\n@Fenced\r\n```\r\n\\@Escaped';
    const refs = language.referencesIn(source);
    assert.deepEqual(refs.map((item) => item.normalized), ['ceneknovak', 'designer']);
    for (const item of refs) assert.equal(source.slice(item.index, item.index + item.raw.length), item.raw);
});

test('shared highlighting sees newly added commitments and leaves fenced keyword-like content literal', () => {
    const source = 'TASK Export\nTASK PURPOSE CONTENT\nGOAL Ask @Writer\n```\nRULE literal\n```';
    const spans = language.highlightBook(source);
    assert.ok(spans.some((item) => item.line === 1 && item.kind === 'keyword' && item.end === 'TASK PURPOSE CONTENT'.length));
    assert.ok(spans.some((item) => item.line === 2 && item.kind === 'reference'));
    assert.ok(spans.some((item) => item.line === 4 && item.kind === 'literal'));
    assert.ok(!spans.some((item) => item.line === 4 && item.kind === 'keyword'));
});

test('literal detection respects fence character, fence length and escaped lines', () => {
    const source = 'AGENT Writer\nSAMPLE Example\n````book\n```\n~~~\nRULE literal\n````\nRULE real\n\\RULE literal';
    assert.equal(language.isLiteral(source, 5), true);
    assert.equal(language.isLiteral(source, 7), false);
    assert.equal(language.isLiteral(source, 8), true);
});

test('legacy BookC renders JSON as escaped, script-free content and enforces archive/expansion limits', async () => {
    const zip = new JSZip().file('index.book.json', JSON.stringify({ text: '<script>bad()</script>' }));
    const text = await bookc.readBookc(await zip.generateAsync({ type: 'uint8array' }));
    const html = bookc.previewHtml('<unsafe>', text);
    assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes("default-src 'none'"));
    await assert.rejects(bookc.readBookc(new Uint8Array(bookc.MAX_BOOKC_BYTES + 1)), /4 MiB/);
    await assert.rejects(bookc.readBookc(await new JSZip().generateAsync({ type: 'uint8array' })), /index.book.json/);
    const bomb = new JSZip().file('index.book.json', ' '.repeat(bookc.MAX_BOOKC_BYTES + 1));
    await assert.rejects(bookc.readBookc(await bomb.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })), /expanded index/);
});
