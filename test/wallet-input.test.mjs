import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { readOwnerCredential } from '../dist/ui/secret.js';

/** Exercises the real terminal key parser with fixture credentials, never actual Wallet data. */
test('Wallet terminal entry: password masked with typing feedback, username visible, toggles without submitting and clears on exit', async () => {
    const stdin = process.stdin;
    const originalRawMode = stdin.setRawMode;
    const writes = [];
    stdin.setRawMode = () => stdin;
    const terminal = { columns: () => 100, write: (text) => writes.push(text) };
    try {
        const username = readOwnerCredential(terminal, 'Username');
        stdin.emit('data', 'fixture-user');
        assert.doesNotMatch(writes.join(''), /fixture-user/);
        assert.match(writes.at(-1), /hidden; Ctrl\+R show\): \*{12}$/, 'masked typing shows neutral feedback');
        stdin.emit('data', '\x12');
        assert.match(writes.at(-1), /visible; Ctrl\+R hide.*fixture-user/);
        let isSubmitted = false;
        void username.then(() => { isSubmitted = true; });
        await Promise.resolve();
        assert.equal(isSubmitted, false);
        stdin.emit('data', '\x12');
        assert.match(writes.at(-1), /hidden; Ctrl\+R show/);
        assert.doesNotMatch(writes.at(-1), /fixture-user/);
        stdin.emit('data', '\r');
        assert.equal(await username, 'fixture-user');
        assert.equal(writes.at(-1), '\r\x1b[2KUsername (hidden)\n');

        const password = readOwnerCredential(terminal, 'Password');
        stdin.emit('data', 'fixture-password');
        assert.doesNotMatch(writes.at(-1), /fixture-password/);
        stdin.emit('data', '\x12');
        assert.match(writes.at(-1), /fixture-password/);
        stdin.emit('data', '\r');
        assert.equal(await password, 'fixture-password');
        assert.equal(writes.at(-1), '\r\x1b[2KPassword (hidden)\n');

        const cancelled = readOwnerCredential(terminal, 'Password');
        stdin.emit('data', 'discarded\x12');
        stdin.emit('data', '\x03');
        await assert.rejects(cancelled, /Cancelled/);
        assert.equal(writes.at(-1), '\r\x1b[2KPassword (hidden)\n');
        assert.equal(stdin.listenerCount('keypress'), 0);

        const visible = readOwnerCredential(terminal, 'Username or email', { isVisible: true });
        stdin.emit('data', 'fixture-user');
        assert.match(writes.at(-1), /visible; Ctrl\+R hide\): fixture-user$/, 'the username starts visible');
        stdin.emit('data', '\x12');
        assert.match(writes.at(-1), /hidden; Ctrl\+R show\): \*{12}$/);
        stdin.emit('data', '\r');
        assert.equal(await visible, 'fixture-user');
        assert.equal(writes.at(-1), '\r\x1b[2KUsername or email (hidden)\n', 'the entry is erased before advancing');

        const narrowWrites = [];
        const narrow = readOwnerCredential({ columns: () => 20, write: (text) => narrowWrites.push(text) }, 'Username');
        stdin.emit('data', 'a-very-long-fixture-username\x12');
        assert.ok(narrowWrites.every((text) => text.replace(/\x1b\[2K|\r|\n/g, '').length < 20), 'entry never wraps into scrollback');
        stdin.emit('data', '\r');
        assert.equal(await narrow, 'a-very-long-fixture-username');
    } finally {
        stdin.setRawMode = originalRawMode;
        stdin.pause();
    }
});

/** A small DOM fixture for exercising the shipped dialog and its native-button contracts. */
function element(tag, attributes = {}, ...children) {
    return { tag, ...attributes, children: children.flat().filter(Boolean), value: attributes.value || '',
        focus() {}, setAttribute(name, value) { this[name] = value; } };
}

/** Finds elements in the dialog fixture. */
function descendants(node, tag) {
    return [ ...(node.tag === tag ? [node] : []), ...node.children.filter((child) => typeof child === 'object').flatMap((child) => descendants(child, tag)) ];
}

test('Wallet browser add, update and pending-login fields toggle independently without saving', async () => {
    const source = await readFile(new URL('../src/service/spa/app.js', import.meta.url), 'utf8');
    const start = source.indexOf('    function walletCredentialField(');
    const end = source.indexOf('    /** First setup:', start);
    assert.ok(start > 0 && end > start);
    for (const initial of [{}, { origin: 'https://example.com', id: 'saved' }, { origin: 'https://example.com', action: 'pending' }]) {
        let dialog;
        const calls = [];
        const open = runInNewContext(`${source.slice(start, end)}; walletLoginDialog`, {
            h: element,
            walletDialog: (title, form) => (dialog = { title, form, close() {} }),
            walletCall: async (...args) => { calls.push(args); return {}; },
        });
        open(initial);
        const inputs = descendants(dialog.form, 'input');
        const [, username, password] = inputs;
        const buttons = descendants(dialog.form, 'button').filter((button) => /^Show /.test(button.children[0]));
        const toggles = descendants(dialog.form, 'button').filter((button) => /^(Show|Hide) /.test(button.children[0]));
        assert.equal(buttons.length, 1);
        assert.equal(toggles.length, 2);
        assert.equal(username.type, 'text', 'the username starts visible');
        assert.equal(toggles[0]['aria-pressed'], 'true');
        assert.equal(password.type, 'password', 'the password starts masked (the browser shows typing feedback)');
        assert.equal(toggles[1]['aria-pressed'], 'false');
        username.value = 'fixture-user';
        password.value = 'fixture-password';
        for (const [index, input] of [username, password].entries()) {
            const button = toggles[index];
            const initialType = input.type;
            const other = [username, password][1 - index];
            const otherType = other.type;
            assert.equal(button.type, 'button', 'native keyboard activation must not submit');
            button.onclick();
            assert.equal(input.type, initialType === 'text' ? 'password' : 'text');
            assert.equal(button['aria-pressed'], String(input.type === 'text'));
            assert.match(button.textContent, input.type === 'text' ? /^Hide / : /^Show /);
            assert.equal(other.type, otherType, 'fields toggle independently');
            button.onclick();
            assert.equal(input.type, initialType);
            assert.equal(button['aria-pressed'], String(initialType === 'text'));
        }
        assert.equal(username.value, 'fixture-user');
        assert.equal(password.value, 'fixture-password');
        assert.equal(calls.length, 0);
        await dialog.form.onsubmit({ preventDefault() {} });
        assert.equal(calls[0][0], 'wallet-save');
        assert.equal(calls[0][1].username, 'fixture-user');
        assert.equal(calls[0][1].request, initial.action);
        assert.equal(calls[0][1].id, initial.id);
    }
});

