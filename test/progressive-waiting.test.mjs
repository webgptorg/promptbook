import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mayBringForward, nextProgressiveWait, progressiveDelay, restoreProgressiveWait, WAITING_POLICIES, withInitialDelay } from '../dist/engine/progressive-waiting.js';
import { SyncCoordinator } from '../dist/engine/sync.js';

/**
 * Deterministic spreading (the middle of the jitter range).
 */
const middle = () => 0.5;

/**
 * One minute, hour and day in milliseconds.
 */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

test('progressive waiting: attention starts around a minute and grows to a week; intervals actually grow and stay capped', () => {
    const attention = WAITING_POLICIES.attention;
    const delays = Array.from({ length: 16 }, (_, index) => progressiveDelay(attention, index + 1, { random: middle }));
    assert.equal(delays[0], MINUTE, 'the first recheck is about one minute');
    for (let index = 1; index < delays.length; index++) assert.ok(delays[index] >= delays[index - 1], `round ${index + 1} never shrinks`);
    assert.ok(delays[3] > delays[0] * 4, 'intervals grow rather than repeat a short poll');
    assert.equal(delays.at(-1), 7 * DAY, 'an old unchanged notice reaches the one-week cap');
    // Spreading stays inside meaningful bounds.
    for (const random of [() => 0, () => 0.999999]) {
        const spread = progressiveDelay(attention, 3, { random });
        assert.ok(spread >= 0.9 * 4 * MINUTE && spread <= 1.1 * 4 * MINUTE, String(spread));
        assert.ok(progressiveDelay(attention, 40, { random }) <= 7 * DAY, 'never above the cap');
        assert.ok(progressiveDelay(attention, 1, { random }) >= MINUTE, 'never below the first delay');
    }
    assert.equal(progressiveDelay(WAITING_POLICIES.taskRecovery, 1, { equivalent: 2, random: middle }), DAY, 'repeated equivalent failures wait longest');
    assert.equal(withInitialDelay(WAITING_POLICIES.chatReply, 500).initialMs, 500, 'fixture overrides keep growth and cap');
    assert.equal(withInitialDelay(WAITING_POLICIES.chatReply, undefined), WAITING_POLICIES.chatReply);
});

test('progressive waiting: known resets and deadlines take precedence; equivalent outcomes are recognized', () => {
    const now = Date.parse('2026-11-05T10:00:00Z');
    const first = nextProgressiveWait(undefined, { cause: 'Quota exhausted (resets in 3600 s)', conditions: 'tools-a' }, WAITING_POLICIES.chatReply, now, { random: middle });
    assert.equal(first.rounds, 1);
    assert.equal(Date.parse(first.nextAt), now + MINUTE);
    const second = nextProgressiveWait(first, { cause: 'Quota exhausted (resets in 3599 s)', conditions: 'tools-a' }, WAITING_POLICIES.chatReply, now + MINUTE, { random: middle });
    assert.equal(second.equivalent, 1, 'counts and times do not make a different outcome');
    assert.equal(second.since, first.since);
    const reset = nextProgressiveWait(second, { cause: 'Quota', conditions: 'tools-a' }, WAITING_POLICIES.chatReply, now, { notBefore: now + 2 * HOUR, random: middle });
    assert.equal(Date.parse(reset.nextAt), now + 2 * HOUR, 'never before a known reset');
    const deadline = nextProgressiveWait(undefined, { cause: 'Waiting', conditions: 'x' }, WAITING_POLICIES.attention, now, { deadline: now + 10_000, random: middle });
    assert.equal(Date.parse(deadline.nextAt), now + 10_000, 'backoff does not silently miss a deadline');
});

test('progressive waiting: restart yields at most one due check without resetting backoff; clock changes are reconciled', () => {
    const now = Date.parse('2026-11-05T10:00:00Z');
    let schedule;
    for (let round = 0; round < 6; round++) schedule = nextProgressiveWait(schedule, { cause: 'Still missing', conditions: 'c' }, WAITING_POLICIES.attention, now - 30 * DAY, { random: middle });
    // Long downtime: the overdue schedule is one check now, with its rounds retained.
    const overdue = restoreProgressiveWait(schedule, WAITING_POLICIES.attention, now);
    assert.equal(Date.parse(overdue.nextAt), now);
    assert.equal(overdue.rounds, 6, 'the next round continues the slower cadence');
    const after = nextProgressiveWait(overdue, { cause: 'Still missing', conditions: 'c' }, WAITING_POLICIES.attention, now, { random: middle });
    assert.ok(Date.parse(after.nextAt) - now >= 64 * MINUTE, 'no reset to the fastest cadence after restart');
    // A future schedule stays as it is.
    const future = nextProgressiveWait(undefined, { cause: 'x', conditions: 'c' }, WAITING_POLICIES.attention, now, { random: middle });
    assert.deepEqual(restoreProgressiveWait(future, WAITING_POLICIES.attention, now + 1_000), future);
    // The clock moved back: the remaining interval is measured from now and bounded by the cap.
    const backwards = restoreProgressiveWait(future, WAITING_POLICIES.attention, now - DAY);
    assert.equal(Date.parse(backwards.nextAt) - (now - DAY), MINUTE);
    const corrupt = restoreProgressiveWait({ ...future, nextAt: 'garbage' }, WAITING_POLICIES.attention, now);
    assert.equal(Date.parse(corrupt.nextAt), now);
    assert.equal(Date.parse(restoreProgressiveWait({ ...future, nextAt: new Date(now + 90 * DAY).toISOString() }, WAITING_POLICIES.attention, now).nextAt), now + 7 * DAY, 'never beyond the domain cap');
});

test('progressive waiting: only changed conditions bring a check forward, and never in a burst', () => {
    const now = Date.parse('2026-11-05T10:00:00Z');
    const schedule = nextProgressiveWait(undefined, { cause: 'x', conditions: 'old' }, WAITING_POLICIES.attention, now, { random: middle });
    assert.equal(mayBringForward(schedule, 'old', MINUTE, now + HOUR), false, 'unchanged conditions are no evidence');
    assert.equal(mayBringForward(schedule, 'new', MINUTE, now + 1_000), false, 'flapping changes cannot cause a burst');
    assert.equal(mayBringForward(schedule, 'new', MINUTE, now + MINUTE), true);
});

test('Git synchronization keeps its failure backoff across a restart instead of resetting to the fastest cadence', async () => {
    let saved;
    const host = (root) => ({
        repositoryRoot: () => root,
        env: process.env,
        gitLock: async (action) => await action(),
        enabled: () => true,
        integrationBlocker: async () => undefined,
        onConflict: async () => undefined,
        onIntegrated: async () => undefined,
        onChange: () => undefined,
        log: () => undefined,
        backoff: { load: async () => saved, save: async (schedule) => void (saved = schedule) },
    });
    // A directory that is not a Git working tree fails deterministically (HEAD cannot be read).
    const { mkdtemp, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const root = await mkdtemp(join(tmpdir(), 'ptbk-sync-backoff-'));
    try {
        const first = new SyncCoordinator(host(root));
        await first.begin();
        assert.equal((await first.request('boundary')).outcome, 'unconfigured');
        assert.equal((await first.request('manual')).outcome, 'unconfigured');
        first.end();
        assert.equal(saved.rounds, 2, 'the failure progression is persisted');
        const restarted = new SyncCoordinator(host(root));
        await restarted.begin();
        restarted.end();
        assert.equal(restarted.view().nextAttemptAt, saved.nextAt, 'the restarted coordinator continues the same schedule');
        assert.equal((await restarted.request('boundary')).outcome, 'skipped', 'boundary triggers coalesce into the existing backoff');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
