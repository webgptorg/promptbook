import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Agenda } from '../dist/engine/agenda.js';
import { projectAt } from '../dist/project/workspace.js';
import { temporaryDirectory } from './helpers.mjs';

test('scheduler wake-up during evaluation survives until the next idle wait, and is consumed once', async (t) => {
    const project = projectAt(await temporaryDirectory(t, 'ptbk scheduler wake'));
    const agenda = new Agenda({ project, mode: 'maintenance', instanceId: 'wake-fixture', env: process.env, cli: {}, persistent: false });
    agenda.wake();
    const first = agenda.wait(60_000, { kind: 'idle', reason: 'fixture evaluation finished', skippable: false });
    let timer;
    try {
        assert.equal(await Promise.race([first, new Promise((resolve) => { timer = setTimeout(() => resolve('lost wake'), 250); })]), 'woken');
    } finally { clearTimeout(timer); agenda.wake(); await first; }
    // Consume the explicit cleanup wake, then verify that ordinary waits still wait for a genuinely new event.
    await agenda.wait(60_000, { kind: 'idle', reason: 'cleanup', skippable: false });
    const next = agenda.wait(60_000, { kind: 'idle', reason: 'no pending event', skippable: false });
    let completed = false;
    void next.then(() => { completed = true; });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(completed, false);
    agenda.wake();
    assert.equal(await next, 'woken');
});

test('a wake-up raised while publishing the waiting view cannot be lost before waiter registration', async (t) => {
    const project = projectAt(await temporaryDirectory(t, 'ptbk wait publication'));
    const agenda = new Agenda({ project, mode: 'maintenance', instanceId: 'publish-wake-fixture', env: process.env, cli: {}, persistent: false });
    let notified = false;
    const unsubscribe = agenda.onChange(() => { if (!notified) { notified = true; agenda.wake(); } });
    const waiting = agenda.wait(60_000, { kind: 'idle', reason: 'publishing the wait', skippable: false });
    let timer;
    try {
        assert.equal(await Promise.race([waiting, new Promise((resolve) => { timer = setTimeout(() => resolve('lost wake'), 250); })]), 'woken');
    } finally { clearTimeout(timer); unsubscribe(); agenda.wake(); await waiting; }
});

test('an internal retry that becomes due during evaluation still wakes the scheduler before later scheduled work', async (t) => {
    const project = projectAt(await temporaryDirectory(t, 'ptbk overdue retry'));
    const now = Date.parse('2026-11-05T12:00:00Z');
    t.mock.method(Date, 'now', () => now);
    for (const field of ['recoveryDue', 'resumeAfter', 'claimDeferred']) {
        for (const remaining of [-1, 0, 5_000]) {
            const agenda = new Agenda({ project, mode: 'maintenance', instanceId: 'overdue-retry-fixture', env: process.env, cli: {}, persistent: false });
            t.mock.getter(agenda, 'timeZone', () => 'UTC');
            agenda[field].set('fixture-run', now + remaining);
            const nextTask = now + 60_000;
            const waits = [];
            t.mock.method(agenda, 'wait', async (ms, view) => { waits.push({ ms, view }); return 'elapsed'; });
            await agenda.waitForNextWork([{ readiness: { kind: 'waiting-until', until: nextTask } }]);
            assert.equal(waits.length, 1);
            assert.equal(waits[0].ms, Math.max(1_000, remaining), `${field}: a retry due in ${remaining} ms cannot fall through to the later task or idle delay`);
            assert.equal(agenda.nextKnownTime, nextTask, 'internal retries do not replace the next scheduled task');
        }
    }
});
