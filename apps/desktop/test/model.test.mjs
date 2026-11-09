import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTIONS, PAGES, VOICE_INTENT_PATH, localDashboardUrl, terminalArguments, dashboardPage, terminalSize, voiceIntent, editorAsset, desktopPolicy, workspaceState, movedDocument } from '../model.cjs';

test('dashboard attachments reject remote, credential-bearing and non-root addresses', () => {
    assert.equal(localDashboardUrl('http://127.0.0.1:3012/'), 'http://127.0.0.1:3012/');
    for (const value of ['https://127.0.0.1:3012/', 'http://localhost:3012/', 'http://127.0.0.1.evil.test:3012/', 'http://user:password@127.0.0.1:3012/', 'file:///etc/passwd', 'http://127.0.0.1:3012/api/state', 'http://127.0.0.1:3012/?token=secret']) assert.throws(() => localDashboardUrl(value));
});

test('embedded terminals invoke only the real CLI, with literal project paths and every named page', () => {
    const root = "C:\\Users\\Pavol\\ptbk\\project\\first & project's";
    for (const page of PAGES) {
        assert.deepEqual(terminalArguments('dashboard', root, page), ['dashboard', '--path', root, '--view', page]);
        assert.equal(dashboardPage(`http://127.0.0.1:3012/#/${page}`), page);
    }
    assert.deepEqual(terminalArguments('init', undefined), ['init', '--no-dashboard']);
    assert.deepEqual(terminalArguments('setup'), ['init', '--with-app']);
    assert.deepEqual(terminalArguments('global'), ['dashboard', '--global']);
    assert.deepEqual(terminalArguments('keep-awake-helper', root), ['keep-awake', '--install-helper', '--path', root]);
    assert.throws(() => terminalArguments('keep-awake-helper', undefined));
    assert.throws(() => terminalArguments('shell', root));
    assert.throws(() => terminalArguments('dashboard', root, '--force'));
    assert.throws(() => terminalArguments('dashboard', 'bad\0path'));
    assert.equal(ACTIONS.has('delete-project-files'), false);
});

test('native terminal dimensions are bounded and robust to invalid input', () => {
    assert.deepEqual(terminalSize(110, 40), { cols: 110, rows: 40 });
    assert.deepEqual(terminalSize(Infinity, -900), { cols: 500, rows: 10 });
    assert.deepEqual(terminalSize('not a number', undefined), { cols: 80, rows: 24 });
});

test('voice intents come only from the own chat view of the window: its origin, path and token, a known action and the chat', () => {
    const origin = 'http://127.0.0.1:3012';
    const token = 'a'.repeat(32);
    const intent = (params, base = origin, path = VOICE_INTENT_PATH) => `${base}${path}?${new URLSearchParams(params)}`;
    assert.deepEqual(voiceIntent(intent({ intent: token, action: 'start', chat: 'Invoices: export' }), origin, token), { action: 'start', chat: 'Invoices: export' });
    for (const action of ['end', 'leave', 'mute-mic', 'unmute-mic', 'mute-output', 'unmute-output']) assert.equal(voiceIntent(intent({ intent: token, action, chat: 'B' }), origin, token).action, action);
    assert.equal(voiceIntent(intent({ intent: 'b'.repeat(32), action: 'start', chat: 'B' }), origin, token), undefined, 'another view token');
    assert.equal(voiceIntent(intent({ intent: token, action: 'start', chat: 'B' }, 'http://127.0.0.1:3013'), origin, token), undefined, 'another origin');
    assert.equal(voiceIntent(intent({ intent: token, action: 'start', chat: 'B' }, origin, '/api/chats'), origin, token), undefined, 'another path');
    assert.equal(voiceIntent(intent({ intent: token, action: 'pick-chat', chat: 'B' }), origin, token), undefined, 'unknown action');
    assert.equal(voiceIntent(intent({ intent: token, action: 'start', chat: '' }), origin, token), undefined, 'no chat');
    assert.equal(voiceIntent(intent({ intent: token, action: 'start', chat: 'a\nb' }), origin, token), undefined, 'control characters');
    assert.equal(voiceIntent(intent({ intent: token, action: 'start', chat: 'B' }), origin, undefined), undefined, 'a view without a token');
});

test('the workspace editor is served only by name from its own built files', () => {
    const available = new Set(['editor.js', 'editor.css', 'codicon.ttf']);
    assert.deepEqual(editorAsset('ptbk-editor://editor/editor.js', available), { name: 'editor.js', type: 'text/javascript; charset=utf-8' });
    assert.equal(editorAsset('ptbk-editor://editor/codicon.ttf', available).type, 'font/ttf');
    for (const target of ['ptbk-editor://editor/../main.cjs', 'ptbk-editor://editor/%2e%2e%2fmain.cjs', 'ptbk-editor://other/editor.js', 'ptbk-editor://editor/editor.js?x=1', 'ptbk-editor://editor/missing.js', 'http://127.0.0.1:3012/editor.js', 'ptbk-editor://editor/sub/editor.js']) {
        assert.equal(editorAsset(target, available), undefined, target);
    }
});

test('a desktop dashboard policy adds only the editor scheme, runtime styles and a blob worker', () => {
    const policy = desktopPolicy("default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");
    const directives = Object.fromEntries(policy.split('; ').map((part) => { const [name, ...sources] = part.split(' '); return [name, sources]; }));
    assert.deepEqual(directives['script-src'], ["'self'", 'ptbk-editor:']);
    assert.deepEqual(directives['style-src'], ["'self'", 'ptbk-editor:', "'unsafe-inline'"]);
    assert.deepEqual(directives['font-src'], ["'self'", 'ptbk-editor:']);
    assert.deepEqual(directives['worker-src'], ["'self'", 'blob:']);
    assert.deepEqual(directives['connect-src'], ["'self'"]);
    assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
    assert.ok(!directives['script-src'].includes("'unsafe-inline'"));
});

test('a persisted workspace keeps regular and pinned tabs, drafts and view states only', () => {
    const state = workspaceState({
        tabs: [
            { kind: 'page', key: 'page:files', page: 'files', mode: 'pinned', title: 'Files' },
            { kind: 'book', key: 'book:agents/writer.book', path: 'agents/writer.book', mode: 'regular', title: 'Writer' },
            { kind: 'file', key: 'file:notes.md', path: 'notes.md', mode: 'preview' },
            { kind: 'page', key: 'page:evil', page: 'evil', mode: 'regular' },
            { kind: 'script', key: 'x', mode: 'regular' },
            { kind: 'book', key: 'book:agents/writer.book', path: 'agents/writer.book', mode: 'regular' },
        ],
        active: 'file:notes.md',
        documents: { 'book:agents/writer.book': { draft: { text: 'AGENT Writer\n', revision: 'abc' }, viewState: { cursorState: [] }, words: 'secret' }, 'file:notes.md': { draft: { text: 'x', revision: 'r' } } },
    });
    assert.deepEqual(state.tabs.map((tab) => [tab.key, tab.mode]), [['page:files', 'pinned'], ['book:agents/writer.book', 'regular']]);
    assert.equal(state.active, null, 'a temporary preview is not restored');
    assert.deepEqual(state.documents, { 'book:agents/writer.book': { draft: { text: 'AGENT Writer\n', revision: 'abc' }, viewState: { cursorState: [] } } });
    assert.deepEqual(workspaceState(undefined), { tabs: [], active: null, documents: {} });
});

test('a moved document carries its tab and editor state, never a page as a document', () => {
    const moved = movedDocument({ tab: { kind: 'file', key: 'file:a.txt', path: 'a.txt', mode: 'preview' }, document: { text: 'a', revision: 'r1', history: { base: '', undo: [[{ offset: 0, length: 0, text: 'a' }]], redo: [] } } });
    assert.equal(moved.tab.mode, 'regular', 'a moved preview becomes a regular tab');
    assert.equal(moved.document.history.undo.length, 1);
    assert.equal(movedDocument({ tab: { kind: 'page', key: 'page:x', page: 'nope' } }), undefined);
    assert.equal(movedDocument({ tab: { kind: 'page', key: 'page:files', page: 'files' }, document: { text: 'x' } }), undefined);
    assert.ok(movedDocument({ tab: { kind: 'page', key: 'page:files', page: 'files', mode: 'pinned' } }).tab.mode === 'pinned');
});
