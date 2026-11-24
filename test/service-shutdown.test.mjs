import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { projectAt } from '../dist/project/workspace.js';
import { ServiceHost } from '../dist/service/host.js';
import { readProcessRecord, writeProcessRecord } from '../dist/service/records.js';
import { BIN, initializedProject, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';

async function within(promise, limitMs) {
    let timer;
    try {
        return await Promise.race([promise, new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Service did not exit within ' + limitMs + ' ms')), limitMs);
        })]);
    } finally {
        clearTimeout(timer);
    }
}

test('several stalled resources share one cleanup deadline and the owner still releases its records and lock', async t => {
    const project = projectAt(await temporaryDirectory(t, 'ptbk-shutdown'));
    const calls = [];
    const stuck = name => () => {
        calls.push(name);
        return new Promise(() => {});
    };
    const host = Object.assign(Object.create(ServiceHost.prototype), {
        options: { project }, instanceId: 'stopping-instance', agenda: { shutdownReason: 'stop' },
        computer: { close: stuck('computer') }, tabs: { closeAll: stuck('tabs') }, browsers: { close: stuck('browsers') },
        controlServer: { close: stuck('control') }, unregister: () => calls.push('unregister'),
        owned: { stop: () => calls.push('owned') }, releaseLock: () => calls.push('lock'),
    });
    await writeProcessRecord(project, { instanceId: host.instanceId });
    const shutdown = host.shutdown();
    assert.equal(host.shutdown(), shutdown, 'a second stop joins the first');
    await within(shutdown, 18_000);
    assert.deepEqual(calls, ['computer', 'tabs', 'browsers', 'control', 'unregister', 'owned', 'lock']);
    assert.equal(await readProcessRecord(project), undefined);
});

test('the foreground executable exits cleanly even with an outstanding provider handle', async t => {
    const { project, directory, env } = await initializedProject(t, { check: 'process.exit(0);\n' });
    const keepAlive = join(directory, 'provider-handle.cjs');
    await writeFile(keepAlive, 'setInterval(() => {}, 60000);\n');
    const child = spawn(process.execPath, ['--require', keepAlive, BIN, 'start', '--foreground', '--paused', '--raw', '--no-server', '--no-persist'], { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const exit = new Promise((resolve, reject) => child.once('error', reject).once('exit', (code, signal) => resolve({ code, signal })));
    t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk; });
    const record = join(project, '.ptbk', 'service', 'process.json');
    await waitFor(async () => {
        if (child.exitCode !== null) throw new Error(output);
        return JSON.parse(await readFile(record, 'utf8').catch(() => '{}')).pid === child.pid;
    }, { message: 'the foreground owner to accept stop' });
    const result = await ptbk(['stop', '--raw', '--timeout', '20s'], { cwd: project, env });
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(await within(exit, 4000), { code: 0, signal: null }, output);
    await assert.rejects(readFile(record), { code: 'ENOENT' });
    await assert.rejects(readFile(join(project, '.ptbk', 'lock.json')), { code: 'ENOENT' });
});
