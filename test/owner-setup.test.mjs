import assert from 'node:assert/strict';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import decodeQR from 'qr/decode.js';
import { localSetupBrowser, showOwnerSetup } from '../dist/cli/owner-setup.js';
import { COMMANDS } from '../dist/cli/registry.js';
import { parseInvocation } from '../dist/cli/parser.js';
import { persistentServiceEnvironment } from '../dist/service/records.js';
import { createStyle } from '../dist/ui/ansi.js';
import { temporaryDirectory, waitFor } from './helpers.mjs';

/** Terminal-only setup output, separate from any engine logger. */
function context(env = {}, options = {}, interactive = true) {
    const lines = [];
    return { env, options, terminal: { interactive, style: createStyle(false), write: (line) => lines.push(line) }, lines };
}

/** An issued, entirely synthetic setup link. */
const setup = { kind: 'issued', url: 'https://abcdefghijklmnopqrstuvwxyz.engines.example/setup#setup-secret-test-only', expiresAt: '2030-01-01T12:30:00Z', engineId: 'abcdefghijklmnopqrstuvwxyz', fingerprint: 'ABCD-EFGH-JKMN-PQRS-TVWX' };

test('owner setup: local desktop detection refuses SSH, headless hosts and explicit opt-outs', () => {
    assert.equal(localSetupBrowser({}, 'darwin'), true);
    assert.equal(localSetupBrowser({ DISPLAY: ':1' }, 'linux'), true);
    assert.equal(localSetupBrowser({ WAYLAND_DISPLAY: 'wayland-0' }, 'linux'), true);
    for (const env of [{}, { DISPLAY: ':1', SSH_CONNECTION: 'ssh' }, { DISPLAY: ':1', SSH_CLIENT: 'ssh' }, { DISPLAY: ':1', SSH_TTY: '/dev/pts/0' }, { DISPLAY: ':1', PTBK_LOGIN_LOCATION: 'remote' }, { DISPLAY: ':1', PTBK_NO_OPEN: '1' }]) {
        assert.equal(localSetupBrowser(env, 'linux'), false);
    }
    assert.equal(localSetupBrowser({}, 'win32'), false);
});

test('owner setup: redirected output gets neither a secret nor a QR code', async () => {
    const c = context({}, {}, false);
    await showOwnerSetup(c, setup);
    assert.deepEqual(c.lines, []);
});

test('owner setup: a local opener receives the complete link as one argument; --no-open still prints setup', { skip: process.platform === 'win32' }, async (t) => {
    const directory = await temporaryDirectory(t, 'owner setup browser');
    const path = join(directory, 'browser');
    const captured = join(directory, 'arguments.json');
    await writeFile(path, `#!${process.execPath}\nimport('node:fs').then(fs => fs.writeFileSync(process.env.SETUP_ARGUMENTS, JSON.stringify(process.argv.slice(2))));\n`);
    await chmod(path, 0o755);
    const env = { ...process.env, DISPLAY: ':1', SSH_CONNECTION: '', SSH_CLIENT: '', SSH_TTY: '', PTBK_LOGIN_LOCATION: 'local', PTBK_NO_OPEN: '', PTBK_BROWSER: path, SETUP_ARGUMENTS: captured };
    const c = context(env);
    await showOwnerSetup(c, setup);
    await waitFor(async () => (await readFile(captured, 'utf8').catch(() => '')) !== '', { timeoutMs: 5000 });
    assert.deepEqual(JSON.parse(await readFile(captured, 'utf8')), [setup.url]);
    assert.ok(c.lines.join('').includes(setup.url));
    assert.ok(c.lines.join('').includes(setup.fingerprint));
    assert.match(c.lines.join(''), /[█▀▄]/u, 'the terminal includes a QR');
    const rows = c.lines.find((line) => /^[█▀▄ ]+\n/u.test(line)).trimEnd().split('\n');
    const scale = 5;
    const width = rows[0].length * scale;
    const height = rows.length * 2 * scale;
    const pixels = new Uint8Array(width * height * 4).fill(255);
    // Read the rendered half-blocks back as an image, including their quiet zone. The glyphs are inverted for a
    // dark terminal; normalise that here so the scanner reads the exact URL printed beside it.
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const glyph = rows[Math.floor(y / (scale * 2))][Math.floor(x / scale)];
        const lower = Math.floor(y / scale) % 2 === 1;
        const dark = glyph === ' ' || glyph === (lower ? '▀' : '▄');
        const at = (y * width + x) * 4;
        pixels[at] = pixels[at + 1] = pixels[at + 2] = dark ? 0 : 255;
    }
    assert.equal(decodeQR({ width, height, data: pixels }), setup.url, 'the QR scans to the complete secret-bearing setup link');
    await writeFile(captured, 'unchanged');
    const disabled = context(env, { open: false });
    await showOwnerSetup(disabled, setup);
    assert.ok(disabled.lines.join('').includes(setup.url));
    assert.equal(await readFile(captured, 'utf8'), 'unchanged');
});

test('owner setup: browser launch failure preserves the printable link', async () => {
    const c = context({ DISPLAY: ':1', PTBK_BROWSER: '/missing/owner-setup-browser' });
    await showOwnerSetup(c, setup);
    assert.ok(c.lines.join('').includes(setup.url));
});

test('owner setup: entry points parse --no-open', () => {
    for (const args of [['start', '--foreground', '--no-open'], ['connect', '--setup-link', '--no-open'], ['connect', '--link', 'test', '--no-open'], ['init', '--prepare-only', '--link', 'test', '--no-open']]) {
        assert.equal(parseInvocation(args, COMMANDS).options.open, false);
    }
});

test('service restarts retain UI policy paths and production mode, never pairing codes or test trust', () => {
    const env = persistentServiceEnvironment({ NODE_ENV: 'production', PTBK_UI_TRUST_POLICY_FILE: '/etc/ptbk/policy.json', PTBK_UI_RELEASE_URL: 'https://ui.example/', PTBK_LINK_CODE: 'secret-link', PTBK_CONFORMANCE_TRUST_FILE: '/tmp/test-trust.json' });
    assert.equal(env.NODE_ENV, 'production');
    assert.equal(env.PTBK_UI_TRUST_POLICY_FILE, '/etc/ptbk/policy.json');
    assert.equal(env.PTBK_UI_RELEASE_URL, 'https://ui.example/');
    assert.equal(env.PTBK_LINK_CODE, undefined);
    assert.equal(env.PTBK_CONFORMANCE_TRUST_FILE, undefined);
});
