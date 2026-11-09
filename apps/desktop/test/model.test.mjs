import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTIONS, PAGES, VOICE_INTENT_PATH, localDashboardUrl, terminalArguments, dashboardPage, terminalSize, voiceIntent } from '../model.cjs';

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
