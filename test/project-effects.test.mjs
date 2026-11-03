import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProjectEffects, snapshotEffects, effectsRequest } from '../dist/engine/effects.js';
import { cueWave, notificationText } from '../dist/ui/native-effects.js';
import { KeyParser, onTerminalReport, terminalHasFocus } from '../dist/ui/keys.js';
import { lookupService } from '../dist/service/control.js';
import { projectAt } from '../dist/project/workspace.js';
import { initializedProject, ptbk } from './helpers.mjs';

/** One nonsecret human-needed occurrence. */
const question = (key, domain = 'chats') => ({ key, kind: 'attention', domain, title: '@Developer · Budget', body: '+@User which amount?', chat: 'Budget', message: 1 });

/** Deterministic coordinator clock; no real sounds, helpers, notifications or elapsed-time waits. */
function fixture() {
    let time = 100_000;
    const coordinator = new ProjectEffects(undefined, () => time);
    return { coordinator, advance: (duration) => { time += duration; }, call: (client, operation, events = [], extra = {}) => coordinator.exchange({ client, operation, ...extra }, events) };
}

test('effects default Off, shared toggle, last-input ownership, no replay on enable/handoff, and final disconnect reset', () => {
    const { coordinator, call, advance } = fixture();
    const backlog = question('older');
    assert.deepEqual(call('dashboard', 'join', [backlog]), { enabled: false, owner: true, effects: [] });
    assert.equal(call('dashboard', 'toggle', [backlog]).enabled, true);
    assert.deepEqual(call('chat', 'join', [backlog]), { enabled: true, owner: true, effects: [] });
    assert.equal(call('dashboard', 'poll', [backlog]).owner, false, 'a repaint or heartbeat never takes ownership');
    advance(10_001);
    coordinator.observe([backlog, question('first')]);
    assert.deepEqual(call('dashboard', 'poll', [backlog, question('first')]).effects, []);
    assert.deepEqual(call('chat', 'poll', [backlog, question('first')]).effects.map((effect) => effect.key), ['first']);
    assert.deepEqual(call('chat', 'poll', [backlog, question('first')]).effects, [], 'a receipt is consumed before returning it');
    assert.equal(call('dashboard', 'input', [backlog, question('first')]).owner, true);
    assert.deepEqual(call('dashboard', 'poll', [backlog, question('first')]).effects, [], 'handoff never replays history');
    call('dashboard', 'leave');
    assert.equal(call('chat', 'poll', [backlog]).owner, true, 'the last used remaining live viewer takes over');
    call('chat', 'leave');
    assert.deepEqual(call('new-session', 'join', [backlog]), { enabled: false, owner: true, effects: [] });
    assert.equal(new ProjectEffects().state.enabled, false, 'an engine restart has a fresh session');
});

test('actual activity suppresses new attention for ten seconds without deferred sound or clearing the request', () => {
    const { coordinator, call, advance } = fixture();
    call('chat', 'join');
    call('chat', 'toggle');
    advance(9999);
    const first = question('suppressed');
    coordinator.observe([first]);
    assert.deepEqual(call('chat', 'poll', [first]).effects, []);
    advance(2);
    assert.deepEqual(call('chat', 'poll', [first]).effects, [], 'becoming idle cannot replay a suppressed occurrence');
    const second = question('fresh');
    coordinator.observe([first, second]);
    assert.deepEqual(call('chat', 'poll', [first, second]).effects.map((effect) => effect.key), ['fresh']);
    assert.deepEqual(coordinator.state.observed, ['suppressed', 'fresh'], 'consumption never marks either request seen');
    coordinator.observe([]);
    coordinator.observe([first]);
    assert.deepEqual(call('chat', 'poll', [first]).effects, [], 'a repeated snapshot/history scan is not a new occurrence');
});

test('a shared seen outcome or saved response withdraws an unclaimed attention effect immediately', () => {
    const { coordinator, call, advance } = fixture();
    call('terminal', 'join'); call('terminal', 'toggle');
    advance(10_001);
    coordinator.observe([question('seen-in-browser')]);
    assert.equal(coordinator.state.pending.length, 1);
    coordinator.observe([]);
    assert.deepEqual(call('terminal', 'poll').effects, [], 'a message already seen or answered is never announced later');
});

test('live reply starts and saved sends have subtle cues during activity; tokens, repeated snapshots and attention do not layer cues', () => {
    const { coordinator, call, advance } = fixture();
    const reply = { key: 'reply:Budget', kind: 'reply', domain: 'chats', title: '', body: '' };
    call('chat', 'join');
    call('chat', 'toggle');
    assert.equal(call('chat', 'cue', [], { cue: 'send' }).effects[0].kind, 'send');
    assert.deepEqual(call('chat', 'poll', [reply]).effects, [reply]);
    assert.deepEqual(call('chat', 'poll', [reply]).effects, []);
    coordinator.observe([]);
    advance(10_001);
    const ping = question('human-needed');
    assert.deepEqual(call('chat', 'poll', [reply, ping]).effects, [ping], 'an attention alert replaces the overlapping incoming cue');
    coordinator.observe([]);
    assert.deepEqual(call('chat', 'poll', [reply]).effects, [reply], 'a later turn can start another reply');
});

test('dead clients expire, transfer discards uncertain deliveries, and a different project is independent', () => {
    const { coordinator, call, advance } = fixture();
    call('dashboard', 'join'); call('dashboard', 'toggle'); call('chat', 'join');
    advance(10_001);
    coordinator.observe([question('before-owner-loss')]);
    call('dashboard', 'poll', [question('before-owner-loss')]);
    advance(5000);
    assert.deepEqual(call('dashboard', 'poll', [question('before-owner-loss')]), { enabled: true, owner: true, effects: [] }, 'the lost owner expires and its uncertain delivery is not replayed');
    assert.equal(fixture().call('other-project', 'join').enabled, false);
    advance(15_001);
    assert.equal(call('new-client', 'join', [question('before-owner-loss')]).enabled, false, 'a completely lost session resets without an independent daemon');
});

test('whole-project sources observe Wallet and Health while chat is open, with task cards contributing no duplicate event', () => {
    const snapshot = { chats: { pings: [{ id: 'budget#1', chat: 'Budget', title: 'Budget', sender: '@Developer', message: 1, text: '+@User which amount?' }], replying: [] }, wallet: { pending: [{ id: 'login', step: 1, problem: 'code', origin: 'https://example.com', account: 'private-account', fields: ['protected-field'], reason: 'protected reason' }] }, health: { incidents: [{ id: 'disk-low', summary: 'Disk low', needsAction: 'Free disk space' }] }, queue: [{ readiness: 'awaiting-user', waitingChat: 'Budget' }], attention: { chats: { key: 'budget#1' }, tasks: { key: 'same-question' } } };
    const events = snapshotEffects(snapshot);
    assert.deepEqual(events.map((event) => event.key), ['chat:budget#1', 'wallet:login:1', 'health:disk-low']);
    assert.doesNotMatch(JSON.stringify(events), /private-account|protected-field|protected reason/);
    snapshot.wallet.pending[0].seenAt = '2026-11-03T00:00:00Z';
    assert.equal(snapshotEffects(snapshot).length, 2);
});

test('protocol reports cannot become text or activity; Ctrl+N is a dedicated key and pasted content stays literal', () => {
    const parser = new KeyParser();
    const reports = [];
    const remove = onTerminalReport((report) => reports.push(report));
    try {
        assert.deepEqual(parser.parse('\x1b]99;i=probe:p=?;p=title,body:a=focus,report\x1b'), []);
        assert.deepEqual(parser.parse('\\hello'), [{ type: 'text', text: 'hello' }]);
        assert.deepEqual(reports, ['99;i=probe:p=?;p=title,body:a=focus,report']);
        assert.deepEqual(parser.parse('\x1b['), []);
        assert.deepEqual(parser.parse('O'), []);
        assert.equal(terminalHasFocus(), false);
        assert.deepEqual(parser.parse('\x1b[I'), []);
        assert.equal(terminalHasFocus(), true);
        assert.deepEqual(parser.parse('\x0e'), [{ type: 'key', name: 'n', ctrl: true }]);
        assert.deepEqual(parser.parse('\x1b[200~literal \x0e text\x1b[201~'), [{ type: 'paste', text: 'literal \x0e text' }]);
    } finally { remove(); }
});

test('optional effects validate callers, strip terminal/URL secrets and synthesize quiet bounded PCM rather than a terminal bell', () => {
    assert.throws(() => effectsRequest({ client: '../outside', operation: 'poll' }), /Invalid/);
    assert.throws(() => effectsRequest({ client: 'valid-client', operation: 'cue', cue: 'token' }), /Invalid/);
    assert.equal(notificationText('Visit https://user:password@example.com/login?code=secret#token \x1b]0;pwned\x07\nnext'), 'Visit https://example.com/login next');
    for (const kind of ['select', 'send', 'reply', 'attention']) {
        const wave = cueWave(kind);
        assert.equal(wave.subarray(0, 4).toString(), 'RIFF');
        assert.equal(wave.readUInt32LE(40), wave.length - 44);
        assert.ok(wave.length < 12_000, 'short bounded sound');
    }
});

test('the real service coordinates dashboards and standalone chat through IPC without changing project settings or requiring HTTP', async (t) => {
    const { project, env } = await initializedProject(t);
    assert.equal((await ptbk(['start', '--no-persist', '--no-server', '--raw'], { cwd: project, env })).code, 0);
    const lookup = await lookupService(projectAt(project));
    assert.equal(lookup.state, 'running');
    const call = (client, operation) => lookup.client.request('project-effects', { client, operation });
    assert.equal((await call('dashboard-client', 'join')).enabled, false);
    assert.equal((await call('dashboard-client', 'toggle')).enabled, true);
    const chat = await call('standalone-chat', 'join');
    assert.equal(chat.enabled, true);
    assert.ok(chat.status.project && chat.status.state);
    assert.equal((await call('dashboard-client', 'poll')).owner, false);
    await call('standalone-chat', 'leave');
    await call('dashboard-client', 'leave');
    assert.equal((await call('next-session', 'join')).enabled, false);
    await call('next-session', 'leave');
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});
