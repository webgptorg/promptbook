import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_IMPACT_CUTOFF, IMPACT_AGING_MS, actionPriority, actionTotals, aggregateImpact, buildActionView, formatImpact, parseActionViewQuery } from '../dist/engine/action-impact.js';

const NOW = Date.parse('2026-11-01T12:00:00Z');
const DAY = 24 * 3_600_000;

/**
 * Close enough for floating point; the exact rounding is left to whoever displays a value.
 */
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message ?? 'value'}: ${actual} is not ${expected}`);

let counter = 0;

/**
 * One action summary, by default one with impact 1, a day old, successful, of Developer in one task.
 */
function action(values = {}) {
    counter += 1;
    const ageDays = values.ageDays ?? 1;
    const { ageDays: _age, ...rest } = values;
    return { path: `actions/task/${String(counter).padStart(5, '0')}.md`, task: 'task', taskName: 'The task', operation: 'Send email', service: 'Gmail', outcome: 'success', agent: '@Developer', at: new Date(NOW - ageDays * DAY).toISOString(), ...('impact' in values ? {} : { impact: 1 }), ...rest };
}

test('impact: aggregation follows the decimal logarithmic examples of the specification', () => {
    near(aggregateImpact([2, 2, 2, 2, 2, 2, 2, 2, 2, 2]), 3, 'ten of 2 are worth one 3');
    near(aggregateImpact(Array(1000).fill(1)), 4, 'a thousand of 1 are worth one 4');
    near(aggregateImpact(Array(10).fill(0)), 1, 'ten of 0 are worth one 1');
    near(aggregateImpact([3, 2]), Math.log10(1100), '1100');
    near(aggregateImpact([2.5]), 2.5, 'a single action stays itself');
    near(aggregateImpact([1.5, 1.5]), 1.5 + Math.log10(2), 'fractional');
    near(aggregateImpact([7, 7]), 7 + Math.log10(2), 'above 6 is not clamped');
    assert.equal(aggregateImpact([]), undefined, 'an empty set has no impact, which is not impact 0');
});

test('impact: aggregation is associative when unrounded and numerically stable at the extremes', () => {
    const scores = [0.3, 1.7, 2, 2.25, 4.1, 0, 3];
    const whole = aggregateImpact(scores);
    for (const split of [1, 2, 3, 5]) near(aggregateImpact([aggregateImpact(scores.slice(0, split)), aggregateImpact(scores.slice(split))]), whole, `split at ${split}`);
    near(aggregateImpact([400, 400]), 400 + Math.log10(2), 'no overflow: 10^400 does not fit a double');
    near(aggregateImpact([-400, -400]), -400 + Math.log10(2), 'no underflow: very old priorities');
    near(aggregateImpact([400, 0]), 400, 'a vanishing member vanishes');
    assert.ok(Number.isFinite(aggregateImpact(Array(200_000).fill(1))), 'very large sets are fine');
});

test('priority: one point per 30 days, saved impact unchanged, and each member is aged before summing', () => {
    assert.equal(IMPACT_AGING_MS, 30 * DAY);
    near(actionPriority(3, NOW - 30 * DAY, NOW), 2, 'a 3 a month ago ties with a fresh 2');
    near(actionPriority(3, NOW + DAY, NOW), 3, 'a future date is no bonus');
    const records = [action({ impact: 3, ageDays: 30 }), action({ impact: 2, ageDays: 0 })];
    const totals = actionTotals(records, NOW);
    near(totals.impact, Math.log10(1100), 'impact does not decay');
    near(totals.priority, Math.log10(200), 'each member is aged first');

    // A fresh minor action does not rejuvenate an old group.
    const old = Array.from({ length: 10 }, () => action({ impact: 4, ageDays: 120 }));
    const withMinor = actionTotals([...old, action({ impact: 0, ageDays: 0 })], NOW);
    near(withMinor.priority, aggregateImpact([...old.map(() => 0), 0]), 'the group ages as its members');
    assert.ok(withMinor.priority < 2, `a fresh minor action does not renew the history: ${withMinor.priority}`);
});

test('priority: outcome plays no part, and equal priorities tie on a stable order', () => {
    const failed = action({ impact: 3, outcome: 'failed', ageDays: 2 });
    const succeeded = action({ impact: 3, outcome: 'success', ageDays: 2 });
    const totals = (record) => actionTotals([record], NOW);
    near(totals(failed).priority, totals(succeeded).priority, 'same impact, same age');
    const forward = buildActionView([failed, succeeded], { sort: 'smart' }, NOW).rows.map((row) => row.key);
    const backward = buildActionView([succeeded, failed], { sort: 'smart' }, NOW).rows.map((row) => row.key);
    assert.deepEqual(forward, backward, 'a stable tie-break does not depend on input order');
    const monthOld = action({ impact: 3, ageDays: 30 });
    const fresh = action({ impact: 2, ageDays: 0 });
    const tie = buildActionView([monthOld, fresh], { sort: 'smart' }, NOW);
    near(tie.rows[0].totals.priority, tie.rows[1].totals.priority, 'the 30-day tie');
    assert.equal(tie.rows[0].key, `action:${fresh.path}`, 'the tie-break prefers the newer action');
});

test('views: a 1,000-email batch is one important row, then all 1,000 separate records with their outcomes', () => {
    const emails = Array.from({ length: 1000 }, (_, index) => action({ impact: 1, group: 'autumn-campaign', target: `reader${index}@example.test`, outcome: index % 100 === 0 ? 'failed' : 'success' }));
    const top = buildActionView(emails, {}, NOW);
    assert.equal(top.rows.length, 1);
    assert.equal(top.rows[0].kind, 'batch');
    near(top.rows[0].totals.impact, 4);
    assert.deepEqual(top.rows[0].totals.outcomes, { failed: 10, success: 990 }, 'a group never claims that all succeeded');
    const members = buildActionView(emails, { batch: 'autumn-campaign', limit: 5000 }, NOW);
    assert.equal(members.totalRows, 1000);
    assert.equal(new Set(members.rows.map((row) => row.action.path)).size, 1000);
    assert.ok(members.rows.every((row) => row.kind === 'action'), 'batches contain actions only');
    assert.equal(buildActionView(emails, { batch: 'autumn-campaign' }, NOW).rows.length, 200, 'and every response stays bounded');
    assert.equal(buildActionView(emails, { batch: 'autumn-campaign', offset: 990, limit: 50 }, NOW).rows.length, 10);
});

test('cutoff: applied after aggregation; ungrouping alone hides subthreshold rows; Show all is independent of grouping', () => {
    assert.equal(DEFAULT_IMPACT_CUTOFF, 1);
    const minor = Array.from({ length: 10 }, () => action({ impact: 0, group: 'tiny' }));
    const top = buildActionView(minor, {}, NOW);
    assert.equal(top.rows.length, 1, 'ten impact-0 actions form a visible group');
    near(top.rows[0].totals.impact, 1);
    assert.equal(buildActionView(minor, { batch: 'tiny' }, NOW).rows.length, 10, 'and every member stays inspectable');
    const ungrouped = buildActionView(minor, { grouping: 'ungrouped' }, NOW);
    assert.equal(ungrouped.rows.length, 0, 'ungrouped alone hides them');
    assert.equal(ungrouped.hidden, 10);
    assert.equal(buildActionView(minor, { grouping: 'ungrouped', showAll: true }, NOW).rows.length, 10);
    assert.equal(minor.filter((item) => item.group === 'tiny').length, 10, 'source data stays');
    assert.equal(buildActionView([action({ impact: 0.5 })], {}, NOW).rows.length, 0, 'cutoff uses impact');
    // The cutoff uses impact, never the current priority.
    assert.equal(buildActionView([action({ impact: 2, ageDays: 300 })], {}, NOW).rows.length, 1, 'an old important action stays visible');
});

test('unknown: separate from zero, always visible, without an invented total', () => {
    const unknown = action({ impact: undefined });
    assert.equal(buildActionView([unknown], {}, NOW).rows.length, 1, 'unknown stays visible by default');
    const allUnknown = actionTotals([action({ impact: undefined, group: 'g' }), action({ impact: undefined, group: 'g' })], NOW);
    assert.equal(allUnknown.impact, undefined);
    assert.equal(allUnknown.incomplete, true);
    assert.equal(formatImpact(allUnknown), 'unknown');
    assert.equal(actionTotals([], NOW).display, 'none', 'an empty set has no impact: neither 0 nor unknown');
    const mixed = actionTotals([action({ impact: 2 }), action({ impact: undefined })], NOW);
    near(mixed.impact, 2, 'known subtotal');
    assert.equal(mixed.unknown, 1);
    assert.equal(formatImpact(mixed), '2+ (1 unknown)');
    const rows = buildActionView([unknown, action({ impact: 5 }), action({ impact: 2, group: 'b' }), action({ impact: undefined, group: 'b' })], { sort: 'impact' }, NOW).rows;
    assert.equal(rows[rows.length - 1].key, `action:${unknown.path}`, 'unknown takes its own position, not a fabricated rank');
    assert.equal(rows[1].kind, 'batch', 'a mixed group sorts by its known subtotal');
});

test('views: default, ungrouped, by task and by agent count each action once; a task under an agent has only that agent’s actions', () => {
    const records = [
        action({ agent: '@Developer', task: 'launch', taskName: 'Launch', impact: 3 }),
        action({ agent: '@Writer', task: 'launch', taskName: 'Launch', impact: 2 }),
        action({ agent: '@Developer', task: 'launch', taskName: 'Launch', impact: 2, group: 'emails' }),
        action({ agent: '@Developer', task: 'launch', taskName: 'Launch', impact: 2, group: 'emails' }),
        action({ agent: '@Developer', task: 'other', taskName: 'Other', impact: 1 }),
        action({ agent: undefined, task: '.engine/initialization', taskName: undefined, system: 'Initialization', impact: undefined, operation: 'Create repository', service: 'GitHub' }),
    ];
    const expected = aggregateImpact([3, 2, 2, 2, 1]);
    const total = (view) => {
        near(view.totals.impact, expected, `${view.grouping} total`);
        assert.equal(view.totals.count, records.length, `${view.grouping} count`);
    };
    const standard = buildActionView(records, {}, NOW);
    total(standard);
    assert.equal(standard.rows.length, 5, 'four single actions and one batch');
    const ungrouped = buildActionView(records, { grouping: 'ungrouped' }, NOW);
    total(ungrouped);
    assert.equal(ungrouped.rows.length, 6, 'every logical action, with batch membership kept');
    assert.equal(ungrouped.rows.filter((row) => row.action.group === 'emails').length, 2);

    const byTask = buildActionView(records, { grouping: 'task' }, NOW);
    total(byTask);
    assert.deepEqual(byTask.rows.map((row) => row.key).sort(), ['task:.engine/initialization', 'task:launch', 'task:other']);
    const launch = buildActionView(records, { grouping: 'task', task: 'launch' }, NOW);
    assert.equal(launch.totals.count, 4);
    assert.deepEqual(launch.rows.map((row) => row.kind).sort(), ['action', 'action', 'batch']);
    assert.match(launch.path[0].label, /Launch/);

    const byAgent = buildActionView(records, { grouping: 'agent' }, NOW);
    total(byAgent);
    assert.deepEqual(byAgent.rows.map((row) => row.key).sort(), ['agent:developer', 'agent:engine', 'agent:writer']);
    near(byAgent.rows.reduce((sum, row) => sum + 10 ** (row.totals.impact ?? Number.NEGATIVE_INFINITY), 0), 10 ** expected, 'no double counting across agents');
    const developer = buildActionView(records, { grouping: 'agent', agent: 'developer' }, NOW);
    assert.equal(developer.level, 'tasks');
    assert.equal(developer.totals.count, 4);
    const own = buildActionView(records, { grouping: 'agent', agent: 'writer', task: 'launch' }, NOW);
    assert.equal(own.totals.count, 1, 'that executor’s own actions only');
    assert.equal(own.rows[0].action.agent, '@Writer');
    assert.equal(buildActionView(records, { grouping: 'agent', agent: 'developer', task: 'launch' }, NOW).totals.count, 3);
    assert.equal(buildActionView(records, { grouping: 'agent', agent: 'engine' }, NOW).rows[0].label, 'No task · Initialization', 'no source task is invented');
});

test('filter: outcomes select individual actions and the subtotal says it is filtered', () => {
    const records = [action({ impact: 2, group: 'b', outcome: 'failed' }), action({ impact: 2, group: 'b', outcome: 'failed' }), action({ impact: 3, group: 'b', outcome: 'success' }), action({ impact: 4, outcome: 'success' })];
    const view = buildActionView(records, { outcome: 'failed' }, NOW);
    assert.equal(view.rows.length, 1);
    const row = view.rows[0];
    near(row.totals.impact, 2 + Math.log10(2), 'the selected subset');
    assert.deepEqual([row.totals.count, row.totals.unfiltered, row.totals.filtered], [2, 3, true]);
    assert.match(formatImpact(row.totals), /filtered$/);
    assert.equal(view.totals.count, 2);
    assert.equal(view.totals.unfiltered, 4);
    const complete = buildActionView(records, {}, NOW);
    assert.equal(complete.rows.find((item) => item.kind === 'batch').totals.filtered, false);
    assert.equal(buildActionView(records, { batch: 'b', outcome: 'failed' }, NOW).rows.length, 2);
});

test('sort: time uses a group’s latest member, impact the unaged total, smart the aged total', () => {
    const oldBig = action({ impact: 5, ageDays: 150 });
    const newSmall = action({ impact: 1, ageDays: 1 });
    const groupOldMember = action({ impact: 2, ageDays: 90, group: 'g' });
    const groupNewMember = action({ impact: 2, ageDays: 10, group: 'g' });
    const records = [oldBig, newSmall, groupOldMember, groupNewMember];
    const keys = (sort) => buildActionView(records, { sort }, NOW).rows.map((row) => row.key);
    assert.deepEqual(keys('time'), [`action:${newSmall.path}`, 'batch:g', `action:${oldBig.path}`]);
    assert.equal(buildActionView(records, { sort: 'time' }, NOW).rows[1].totals.latestAt, groupNewMember.at);
    assert.deepEqual(keys('impact'), [`action:${oldBig.path}`, 'batch:g', `action:${newSmall.path}`]);
    assert.equal(keys('smart')[0], 'batch:g', 'its recent member is still worth 2 minus a third of a point');
});

test('display: rounding happens only in the display, and queries from untrusted strings fall back to defaults', () => {
    assert.equal(formatImpact(actionTotals([action({ impact: 10 })], NOW)), '10');
    assert.equal(formatImpact(actionTotals([action({ impact: 0 })], NOW)), '0');
    assert.equal(formatImpact(actionTotals([action({ impact: 2.5 })], NOW)), '2.5');
    assert.equal(formatImpact(actionTotals([action({ impact: 3 }), action({ impact: 2 })], NOW)), '3.04');
    assert.equal(formatImpact(actionTotals([action({ impact: 100 })], NOW)), '100');
    assert.deepEqual(parseActionViewQuery((name) => ({ grouping: 'nonsense', sort: 'time', showAll: 'true', outcome: ' failed ', offset: '5', limit: 'x' })[name]), { sort: 'time', showAll: true, outcome: 'failed', offset: 5 });
    assert.deepEqual(parseActionViewQuery(() => undefined), {});
});
