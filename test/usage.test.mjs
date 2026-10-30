import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { appendUsage, chatUsageFile, normalizeUsage, parseUsageRequest, readUsage, summarizeUsage, taskUsageFile, usageRecords, usageUnits } from '../dist/engine/usage.js';
import { priceOf, readPriceObservations, recordPriceObservation } from '../dist/engine/pricing.js';
import { temporaryDirectory } from './helpers.mjs';

const TUESDAY = '2026-10-27T10:00:00.000Z';

/**
 * Raw records of one run with the given observations.
 */
function run({ agent, observations = [], harness = 'openai-codex', model = 'gpt-test', authentication = 'api', outcome = 'completed', work = { kind: 'task', task: 'Write the page' }, initiator, parent, startedAt = TUESDAY }) {
    return usageRecords({ observations, startedAt, harness, tool: harness, model, authentication, outcome, attribution: { agent, owner: agent, initiator, work, ...(parent ? { parent } : {}) } });
}

test('raw usage: provider fields are kept, normalized with their inclusion semantics, and unknown is never zero', () => {
    const [codex] = run({ agent: 'Developer', observations: [{ at: TUESDAY, usage: { input_tokens: 1000, cached_input_tokens: 400, output_tokens: 200, reasoning_output_tokens: 50 }, semantics: 'cumulative' }] });
    assert.equal(codex.schema, 'ptbk-usage/1');
    assert.deepEqual(codex.provider, { input_tokens: 1000, cached_input_tokens: 400, output_tokens: 200, reasoning_output_tokens: 50 });
    assert.deepEqual(codex.normalized, { input: 1000, output: 200, cachedInput: 400, reasoning: 50 });
    assert.deepEqual(codex.included, { cachedInInput: true, reasoningInOutput: true }, 'cached and reasoning counts are not additional for Codex');
    assert.equal(codex.billing, 'api');
    assert.deepEqual(normalizeUsage('claude-code', { input_tokens: 10, cache_read_input_tokens: 5, cache_creation_input_tokens: 2, output_tokens: 3 }), { normalized: { input: 10, output: 3, cachedInput: 5, cacheWrite: 2 }, included: { cachedInInput: false } });
    const [missing] = run({ agent: 'Developer', outcome: 'failed', authentication: 'account' });
    assert.deepEqual([missing.certainty, missing.semantics, missing.billing, missing.normalized], ['unavailable', 'none', 'subscription', undefined], 'a failed attempt without usage is recorded as unavailable');
});

test('raw usage: streamed cumulative observations and a final total count once; deltas add up', () => {
    const cumulative = run({ agent: 'Developer', observations: [{ at: '2026-10-27T10:00:01Z', usage: { input_tokens: 100, output_tokens: 10 }, semantics: 'cumulative' }, { at: '2026-10-27T10:00:05Z', usage: { input_tokens: 300, output_tokens: 40 }, semantics: 'cumulative' }] });
    const deltas = run({ agent: 'Planner', harness: 'opencode', observations: [{ at: '2026-10-27T10:00:01Z', usage: { input: 100, output: 10 }, costUsd: 0.01, semantics: 'delta' }, { at: '2026-10-27T10:00:02Z', usage: { input: 50, output: 5 }, costUsd: 0.02, semantics: 'delta' }] });
    const units = usageUnits([...cumulative, ...deltas]);
    assert.deepEqual(units.map((unit) => [unit.attribution.agent, unit.categories.input, unit.categories.output]), [['Developer', 300, 40], ['Planner', 150, 15]]);
    assert.ok(Math.abs(units[1].costUsd - 0.03) < 1e-9, 'provider-reported delta costs add up');
});

test('usage views: self and inclusive agent views overlap while the project total counts each consumption once', () => {
    const now = Date.parse('2026-10-28T12:00:00Z');
    const records = [
        ...run({ agent: 'Developer', initiator: 'User', observations: [{ at: TUESDAY, usage: { input_tokens: 1000, output_tokens: 100 }, semantics: 'cumulative' }] }),
        ...run({ agent: 'Lawyer', initiator: 'Developer', harness: 'claude-code', authentication: 'account', work: { kind: 'consultation', task: 'Write the page' }, parent: { kind: 'task', name: 'Write the page', agent: 'Developer' }, observations: [{ at: TUESDAY, usage: { input_tokens: 500, output_tokens: 50 }, semantics: 'cumulative' }] }),
        ...run({ agent: 'Chatter', initiator: 'User', work: { kind: 'chat', chat: 'Talk' } }).map((record) => ({ ...record, observedAt: TUESDAY, consumed: { from: TUESDAY, to: TUESDAY } })),
        ...run({ agent: 'Developer', initiator: 'User', startedAt: '2026-10-01T10:00:00Z', observations: [{ at: '2026-10-01T10:00:00Z', usage: { input_tokens: 9999, output_tokens: 9999 }, semantics: 'cumulative' }] }),
    ];
    const self = summarizeUsage(records, { grouping: 'agent', now });
    assert.equal(self.days, 7);
    assert.deepEqual(self.rows.map((row) => [row.label, row.input]), [['Developer', 1000], ['Lawyer', 500], ['Chatter', 0]], 'the seven-day window leaves out older work');
    const inclusive = summarizeUsage(records, { grouping: 'agent', scope: 'inclusive', now });
    assert.equal(inclusive.rows.find((row) => row.label === 'Developer').input, 1500, "Developer's inclusive view contains the consultation it initiated");
    assert.equal(inclusive.rows.find((row) => row.label === 'Lawyer').input, 500, 'the consultant keeps its own consumption');
    assert.equal(inclusive.total.input, 1500, 'the project total counts every consumption once');
    assert.deepEqual(inclusive.total.coverage, { reported: 2, unavailable: 1, costReported: 0 }, 'unavailable usage is visible, not zero');
    assert.deepEqual(inclusive.total.billing, { subscription: 1, api: 2, unknown: 0 });
    assert.deepEqual(summarizeUsage(records, { grouping: 'harness', now }).rows.map((row) => row.label).sort(), ['claude-code (claude-code)', 'openai-codex (openai-codex)']);
});

test('usage views: filters by agent, task, chat, kind, tool, harness and model combine; missing attribution stays explicit', () => {
    const now = Date.parse('2026-10-28T12:00:00Z');
    const observed = (input) => [{ at: TUESDAY, usage: { input_tokens: input, output_tokens: 1 }, semantics: 'cumulative' }];
    const records = [
        ...run({ agent: 'Developer', initiator: 'User', observations: observed(1000) }),
        ...run({ agent: 'Developer', initiator: 'User', model: 'gpt-other', work: { kind: 'task', task: 'Fix the login' }, observations: observed(300) }),
        ...run({ agent: 'Lawyer', initiator: 'Developer', harness: 'claude-code', work: { kind: 'consultation' }, parent: { kind: 'task', name: 'Write the page', agent: 'Developer' }, observations: observed(500) }),
        ...run({ agent: 'Chatter', initiator: 'User', work: { kind: 'chat', chat: 'Talk' }, observations: observed(70) }),
    ];
    const byTask = summarizeUsage(records, { grouping: 'task', now });
    assert.deepEqual(byTask.rows.map((row) => [row.label, row.input, row.filter]), [['Write the page', 1000, { task: 'Write the page' }], ['not in a task', 570, undefined], ['Fix the login', 300, { task: 'Fix the login' }]], 'work outside a task is its own explicit row');
    const inclusiveTask = summarizeUsage(records, { grouping: 'task', scope: 'inclusive', now });
    assert.equal(inclusiveTask.rows.find((row) => row.label === 'Write the page').input, 1500, 'the inclusive view of a task contains its consultation');
    const developer = summarizeUsage(records, { grouping: 'model', filter: { agent: '@developer' }, now });
    assert.deepEqual(developer.filter, { agent: '@developer' });
    assert.equal(developer.total.input, 1300, 'the filter selects the executing agent; the total counts each consumption once');
    assert.deepEqual(developer.rows.map((row) => [row.label, row.filter]), [['gpt-test', { model: 'gpt-test' }], ['gpt-other', { model: 'gpt-other' }]]);
    assert.equal(summarizeUsage(records, { filter: { agent: 'Developer' }, scope: 'inclusive', now }).total.input, 1800, 'inclusive scope adds the work the agent initiated');
    const combined = summarizeUsage(records, { grouping: 'tool', filter: { agent: 'Developer', model: 'gpt-other', work: 'task' }, now });
    assert.deepEqual([combined.total.input, combined.rows.map((row) => row.label)], [300, ['openai-codex']], 'filters combine');
    assert.deepEqual(summarizeUsage(records, { grouping: 'chat', filter: { harness: 'openai-codex' }, now }).rows.map((row) => row.label), ['not in a chat', 'Talk']);
    assert.equal(summarizeUsage(records, { filter: { task: 'No such task' }, now }).total.units, 0);
    const request = parseUsageRequest((name) => ({ group: 'task', scope: 'inclusive', agent: ' Developer ', model: '', days: 30 })[name]);
    assert.deepEqual(request, { days: 30, grouping: 'task', scope: 'inclusive', filter: { agent: 'Developer' } }, 'empty filter fields are ignored');
    assert.throws(() => parseUsageRequest((name) => ({ group: 'account' })[name]), /group=none\|agent/);
});

test('historical pricing: a cheaper Wednesday list never reprices Tuesday; corrected Tuesday rates recalculate without editing usage', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk pricing');
    const project = { root, runtime: { root: join(root, '.ptbk') } };
    const [unit] = usageUnits(run({ agent: 'Developer', observations: [{ at: TUESDAY, usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 }, semantics: 'cumulative' }] }));
    assert.equal(priceOf(unit, await readPriceObservations(project)), undefined, 'no price list: usage stays, its price is unknown');
    await recordPriceObservation(project, { harness: 'openai-codex', observedAt: '2026-10-26T08:00:00Z', source: 'fixture', currency: 'USD', rates: { 'gpt-test': { input: 2, output: 8 } } });
    await recordPriceObservation(project, { harness: 'openai-codex', observedAt: '2026-10-28T08:00:00Z', source: 'fixture', currency: 'USD', rates: { 'gpt-test': { input: 1, output: 4 } } });
    assert.deepEqual(priceOf(unit, await readPriceObservations(project)), { amount: 10, currency: 'USD', certainty: 'observed' }, "Tuesday keeps Tuesday's rate");
    await recordPriceObservation(project, { harness: 'openai-codex', observedAt: '2026-10-28T09:00:00Z', source: 'corrected evidence', currency: 'USD', effectiveFrom: '2026-10-27T00:00:00Z', effectiveTo: '2026-10-28T00:00:00Z', rates: { 'gpt-test': { input: 3, output: 9 } } });
    assert.deepEqual(priceOf(unit, await readPriceObservations(project)), { amount: 12, currency: 'USD', certainty: 'effective' }, 'corrected effective rates recalculate the derived price');
    const [earlier] = usageUnits(run({ agent: 'Developer', startedAt: '2026-10-20T10:00:00Z', observations: [{ at: '2026-10-20T10:00:00Z', usage: { input_tokens: 1_000_000, output_tokens: 0 }, semantics: 'cumulative' }] }));
    assert.equal(priceOf(earlier, await readPriceObservations(project)).certainty, 'estimated', 'only later lists: a labelled estimate');
    const [subscription] = usageUnits(run({ agent: 'Developer', authentication: 'account', observations: [{ at: TUESDAY, usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 }, semantics: 'cumulative' }] }));
    const summary = summarizeUsage([...run({ agent: 'Developer', authentication: 'account', observations: [{ at: TUESDAY, usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 }, semantics: 'cumulative' }] })], { now: Date.parse('2026-10-28T12:00:00Z'), prices: await readPriceObservations(project) });
    assert.equal(subscription.billing, 'subscription');
    assert.deepEqual([summary.total.calculated.apiUsd, summary.total.calculated.subscriptionEquivalentUsd], [0, 12], 'subscription work is only a labelled token-price equivalent');
});

test('raw usage files: task evidence next to the trace, chat evidence of its own; reading never manufactures usage', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk usage files');
    const taskFile = taskUsageFile(join(root, 'traces', '2026-10-27-1000-write-page'));
    const chatFile = chatUsageFile({ root }, join(root, 'chats', '2026-10-27-1000-talk.book'));
    assert.equal(chatFile, join(root, 'traces', '.chats', '2026-10-27-1000-talk', 'usage.jsonl'));
    await appendUsage(taskFile, run({ agent: 'Developer', observations: [{ at: TUESDAY, usage: { input_tokens: 5 }, semantics: 'cumulative' }] }));
    await appendUsage(chatFile, run({ agent: 'Chatter', work: { kind: 'chat', chat: 'Talk' } }));
    const before = await readFile(taskFile, 'utf8');
    const records = await readUsage({ root });
    assert.deepEqual(records.map((record) => record.attribution.agent).sort(), ['Chatter', 'Developer']);
    summarizeUsage(records);
    assert.equal(await readFile(taskFile, 'utf8'), before, 'views only read the raw records');
});
