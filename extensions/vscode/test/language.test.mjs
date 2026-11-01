import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import language from '../../../dist-vscode/test/language.cjs';
import bookc from '../../../dist-vscode/test/bookc.cjs';
import { activateEditor, bookDocument } from './editor.mjs';

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

test('chat action prefixes and task direction use the shared language knowledge', () => {
    const source = 'CHAT Discussion\nCHAT MEMBER @User\nCHAT MESSAGE @User 2026-10-31T20:00:00+01:00\nPlease ask +@Adam and +{Frontend Developer}, not x+@Nobody.\n';
    const references = language.referencesIn(source);
    assert.deepEqual(references.filter((item) => item.active).map((item) => item.name), ['Adam', 'Frontend Developer'], 'the plus stays outside the name');
    assert.equal(references.some((item) => item.name === 'Nobody'), false);
    const task = 'TASK Example\nGOAL Work.\nTASK CHANGE 2026-10-31T20:00:00+01:00 task {Discussion}\nChange it.\nTASK REOPEN 2026-10-31T20:00:00+01:00\n';
    assert.equal(language.analyze(task).diagnostics.length, 0);
    assert.ok(language.keywordCompletions('TASK Example\nTASK ', 1, 5).some((item) => item.keyword === 'TASK CHANGE'));
    assert.ok(language.keywordCompletions('TASK Example\nTASK ', 1, 5).some((item) => item.keyword === 'TASK REOPEN'));
});

test('reference occurrences share identity across @/braces, accents and separators, including the declaration', () => {
    const source = '\uFEFFAGENT Fronténd Developer\r\nGOAL 👋 Ask @FrontendDeveloper, {frontend_developer} and +{Fronténd Developer}.\r\nNOTE `@FrontendDeveloper` me@FrontendDeveloper {{FrontendDeveloper}}\r\n\\@FrontendDeveloper\r\n```\r\n{Frontend Developer}\r\n```';
    const selected = source.indexOf('@FrontendDeveloper');
    const highlights = language.referenceHighlights(source, selected);
    assert.deepEqual(highlights.map((item) => item.raw), ['Fronténd Developer', '@FrontendDeveloper', '{frontend_developer}', '{Fronténd Developer}']);
    assert.deepEqual(highlights.map((item) => item.declaration), [true, false, false, false]);
    for (const item of highlights) assert.equal(source.slice(item.index, item.index + item.raw.length), item.raw);
    assert.deepEqual(language.referenceHighlights(source, source.indexOf('Developer')), highlights, 'selecting the declaration finds the same uses');
    assert.deepEqual(language.referenceHighlights(source, source.indexOf('GOAL')), []);
    assert.equal(language.referenceAt(source, selected).raw, '@FrontendDeveloper');
    assert.equal(language.referenceAt(source, selected + '@FrontendDeveloper'.length), undefined, 'trailing punctuation is not part of the link');
    const lines = source.split('\n');
    const spans = language.highlightBook(source);
    assert.deepEqual(spans.filter((item) => item.kind === 'reference').map((item) => lines[item.line].slice(item.start, item.end)), highlights.filter((item) => !item.declaration).map((item) => item.raw));
    assert.equal(lines[0].slice(spans[0].start, spans[0].end), 'AGENT', 'a BOM does not shift semantic tokens');
});

test('definition links cover every character of both syntaxes and select agent, task and chat names', async () => {
    const names = ['Čeněk Novák', 'Improve export — 2026-11-01 02:56:00', 'Discuss export'];
    const source = bookDocument('/project/chats/current.book', `CHAT Current\r\nCHAT MEMBER @CenekNovak\r\nCHAT MESSAGE @CenekNovak 2026-11-01T02:56:00+01:00\r\n👋 Ask {Čeněk Novák}, {${names[1]}} and {${names[2]}}.`);
    const disk = new Map([
        ['file:///project/agents/.core/person.book', `\uFEFFAGENT ${names[0]}\r\nGOAL Help.`],
        ['file:///project/tasks/random-file.book.md', `TASK ${names[1]}\nGOAL Export.`],
        ['file:///project/chats/random-file.ptbk.md', `CHAT ${names[2]}\nCHAT MEMBER @User`],
    ]);
    const editor = activateEditor([source], disk);
    const token = { isCancellationRequested: false };
    for (const [raw, name] of [['@CenekNovak', names[0]], ...names.map((name) => [`{${name}}`, name])]) {
        const start = source.text.indexOf(raw);
        for (let character = 0; character < raw.length; character++) {
            const links = await editor.definition.provideDefinition(source, source.positionAt(start + character), token);
            assert.equal(links.length, 1, raw);
            const [link] = links;
            // VS Code and TextDecoder consume the file's encoding BOM rather than showing it in the target buffer.
            const target = disk.get(link.targetUri.toString()).replace(/^\uFEFF/, '').split('\n')[link.targetSelectionRange.start.line];
            assert.equal(target.slice(link.targetSelectionRange.start.character, link.targetSelectionRange.end.character), name);
            assert.equal(source.offsetAt(link.originSelectionRange.start), start);
            assert.equal(source.offsetAt(link.originSelectionRange.end), start + raw.length);
        }
    }
    assert.equal(editor.searches[0].pattern.pattern, '**/*.{book,book.md,ptbk,ptbk.md}');
    assert.ok(!editor.searches[0].exclude.includes('.core'), 'hidden core agents remain discoverable');
});

test('definition navigation uses changed and newly created buffers and respects workspace boundaries and cancellation', async () => {
    const source = bookDocument('/project/current.book', 'AGENT Caller\nGOAL Ask @Writer, @NewAgent, @OldName, @OtherProject and @Missing.');
    const changed = bookDocument('/project/agents/changed.book', 'AGENT Writer\nGOAL Updated but not saved.');
    const fresh = bookDocument('/project/agents/new.book', 'AGENT NewAgent\nGOAL Created but not saved.');
    const other = bookDocument('/other/agent.book', 'AGENT OtherProject\nGOAL Elsewhere.');
    const disk = new Map([[changed.uri.toString(), 'AGENT OldName\nGOAL Old saved name.']]);
    const editor = activateEditor([source, changed, fresh, other], disk);
    const navigate = (name, cancelled = false) => editor.definition.provideDefinition(source,
        source.positionAt(source.text.indexOf(`@${name}`)), { isCancellationRequested: cancelled });
    assert.equal((await navigate('Writer'))[0].targetUri.toString(), changed.uri.toString());
    assert.equal((await navigate('NewAgent'))[0].targetUri.toString(), fresh.uri.toString());
    for (const name of ['OldName', 'OtherProject', 'Missing']) assert.equal((await navigate(name)).length, 0, name);
    assert.equal(await navigate('Writer', true), undefined);
    fresh.text = 'AGENT Renamed\nGOAL Changed again.';
    assert.equal((await navigate('NewAgent')).length, 0, 'navigation has no stale declaration cache');
});

test('the registered highlight and semantic providers agree on complete references and skip literal occurrences', () => {
    const document = bookDocument('/project/agents/writer.book', 'AGENT Writer\nGOAL Ask @writer or +{Wri-ter}.\nNOTE `@Writer` mail@Writer {{Writer}}\n\\@Writer\n```\n{Writer}\n```');
    const editor = activateEditor([document]);
    const references = language.referencesIn(document.text);
    const highlights = editor.highlights.provideDocumentHighlights(document, document.positionAt(references[0].index));
    assert.deepEqual(Array.from(highlights, (item) => document.text.slice(document.offsetAt(item.range.start), document.offsetAt(item.range.end))), ['Writer', '@writer', '{Wri-ter}']);
    assert.deepEqual(Array.from(highlights, (item) => item.kind), [2, 1, 1]);
    const tokens = editor.tokens.provideDocumentSemanticTokens(document).filter((item) => item.type === 2);
    assert.deepEqual(Array.from(tokens, (item) => document.lineAt(item.line).text.slice(item.start, item.start + item.length)), ['@writer', '{Wri-ter}']);
    for (const offset of [document.text.indexOf('`@Writer') + 1, document.text.indexOf('mail@Writer') + 4, document.text.indexOf('\\@Writer') + 1]) {
        assert.equal(editor.highlights.provideDocumentHighlights(document, document.positionAt(offset)).length, 0);
    }
});
