import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NativeComputerBackend } from '../dist/computer/native.js';

test('Windows native helper compiles and answers its real startup protocol', { skip: process.platform !== 'win32', timeout: 90_000 }, () => {
    const executable = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const script = fileURLToPath(new URL('../dist/computer/native/windows.ps1', import.meta.url));
    const result = spawnSync(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-File', script], {
        input: `${JSON.stringify({ id: 1, op: 'status' })}\n${JSON.stringify({ id: 2, op: 'close' })}\n`,
        encoding: 'utf8', timeout: 60_000, windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, 'The bundled Windows helper must compile and exit cleanly.');
    const responses = result.stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    const status = responses.find((response) => response.id === 1);
    assert.ok(status?.result, 'Capability failure must not conceal a helper compilation or startup failure.');
    assert.equal(status.result.supported, true);
    assert.equal(typeof status.result.available, 'boolean');
    assert.equal(status.result.cursor, 'shared');
    assert.equal(responses.find((response) => response.id === 2)?.result?.closed, true);
});

test('native desktop refuses all observations and inputs before an attributed indicator is acknowledged', async () => {
    const backend = new NativeComputerBackend();
    try {
        await assert.rejects(backend.execute({ op: 'screenshot' }), /visible attributed control indicator/);
        await assert.rejects(backend.execute({ op: 'clipboardWrite', text: 'sensitive-value-must-not-appear' }), (error) => {
            assert.match(error.message, /visible attributed control indicator/);
            assert.ok(!error.message.includes('sensitive-value-must-not-appear'));
            return true;
        });
        const abort = new AbortController();
        abort.abort();
        await assert.rejects(backend.execute({ op: 'move', x: 5, y: 5 }, abort.signal), /interrupted/);
    } finally { await backend.close(); }
});

test('native capability probing is truthful and never silently substitutes another host platform', async () => {
    const backend = new NativeComputerBackend();
    try {
        const status = await backend.status();
        assert.equal(status.platform, process.platform);
        assert.equal(status.cursor, 'shared');
        assert.equal(typeof status.available, 'boolean');
        assert.equal(typeof status.lastHumanInputAt, 'number');
        if (process.platform !== 'win32' && !(process.platform === 'darwin' && process.arch === 'arm64')) {
            assert.equal(status.available, false);
            assert.equal(status.supported, false);
            assert.ok(status.reason);
        }
        // Capability probing starts no agent observation and does not authorize an input primitive.
        await assert.rejects(backend.execute({ op: 'screenshot' }), /visible attributed control indicator/);
    } finally { await backend.close(); }
    const closed = await backend.status();
    assert.equal(closed.available, false);
});
