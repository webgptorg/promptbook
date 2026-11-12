import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { computerDirectory, desktopExclusive } from '../dist/computer/protection.js';
import { temporaryDirectory } from './helpers.mjs';

/** Inject native sharing failures into the real ticket reader without changing the lock implementation. */
function interceptReads(t, intercept) {
    const original = fs.readFile;
    t.mock.method(fs, 'readFile', (file, ...arguments_) => intercept(file, () => original(file, ...arguments_)));
    syncBuiltinESMExports();
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
}

for (const code of ['EPERM', 'EACCES', 'EBUSY']) {
    test(`desktop lock waits for a ${code} rival ticket to become readable or genuinely disappear`, async (t) => {
        const root = await temporaryDirectory(t, 'ptbk sharing retry');
        const env = { PTBK_HOME: root };
        const directory = join(computerDirectory(env), 'operations');
        await fs.mkdir(directory, { recursive: true });
        const rival = join(directory, `${process.pid}-rival.json`);
        await fs.writeFile(rival, JSON.stringify({ pid: process.pid, choosing: true, number: 0 }));
        let denied = 0;
        let entered = false;
        interceptReads(t, async (file, read) => {
            if (file === rival) {
                assert.equal(entered, false, 'an unreadable rival must keep the critical section blocked');
                if (denied++ < 3) throw Object.assign(new Error('Transient native sharing failure'), { code });
                // Its owner completes while the read was temporarily denied. Only this real ENOENT clears it.
                await fs.rm(rival, { force: true });
            }
            return read();
        });
        await desktopExclusive(env, async () => { entered = true; });
        assert.equal(entered, true);
        assert.ok(denied >= 4, 'temporary access errors must be retried before entering');
    });
}

test('persistent ticket access failure stays closed, rejects within the retry budget and removes its own ticket', { timeout: 3000 }, async (t) => {
    const root = await temporaryDirectory(t, 'ptbk sharing denied');
    const env = { PTBK_HOME: root };
    const directory = join(computerDirectory(env), 'operations');
    const denied = Object.assign(new Error('Persistent native sharing failure'), { code: 'EPERM' });
    let entered = false;
    let attempts = 0;
    interceptReads(t, (file, read) => {
        if (typeof file === 'string' && dirname(file) === directory && file.endsWith('.json')) {
            attempts++;
            throw denied;
        }
        return read();
    });
    await assert.rejects(desktopExclusive(env, async () => { entered = true; }), (error) => error === denied);
    assert.equal(entered, false);
    assert.ok(attempts > 1, 'a transient-looking error receives a bounded recovery attempt');
    assert.deepEqual(await fs.readdir(directory), [], 'failed acquisition must not strand its live ticket');
});

test('cancelling a denied ticket read interrupts its retry wait and removes its own ticket', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk sharing cancellation');
    const env = { PTBK_HOME: root };
    const directory = join(computerDirectory(env), 'operations');
    const abort = new AbortController();
    let firstRead;
    const reading = new Promise((resolve) => { firstRead = resolve; });
    let entered = false;
    interceptReads(t, (file, read) => {
        if (typeof file === 'string' && dirname(file) === directory && file.endsWith('.json')) {
            firstRead();
            throw Object.assign(new Error('Transient native sharing failure'), { code: 'EACCES' });
        }
        return read();
    });
    const pending = desktopExclusive(env, async () => { entered = true; }, abort.signal);
    const rejected = assert.rejects(pending, (error) => error.name === 'AbortError');
    await reading;
    abort.abort();
    await rejected;
    assert.equal(entered, false);
    assert.deepEqual(await fs.readdir(directory), []);
});
