import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { ChatStore } from '../dist/chats/store.js';
import { VoiceCall } from '../dist/chats/voice-call.js';
import { HARNESS_PLUGINS, harnessPlugin } from '../dist/harness/registry.js';
import { VoiceUnavailableError, remoteTerminal, voiceSupport } from '../dist/harness/voice.js';
import { guidance } from '../dist/engine/voice-calls.js';
import { projectAt } from '../dist/project/workspace.js';
import { ControlClient } from '../dist/service/control.js';
import { FeatureSurface } from '../dist/ui/feature-server.js';
import { VoiceSurfaceRelay } from '../dist/ui/voice-surface.js';
import { voiceFeaturePage } from '../dist/ui/voice-page.js';
import { readProcessRecord } from '../dist/service/records.js';
import { fakeHarness, git, initializedProject, ptbk, surfaceClient, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * Loud (speech-like) or silent mono 24 kHz PCM of ~85 ms.
 */
function pcm(loud = true) {
    const data = Buffer.alloc(4096);
    if (loud) for (let index = 0; index < 2048; index++) data.writeInt16LE(Math.round(Math.sin(index / 5) * 12_000), index * 2);
    return data;
}

/**
 * A recording frame of the media page: the side tag (0 microphone, 1 the agent's received voice) and PCM.
 */
function frame(side, data = pcm()) {
    return Buffer.concat([Buffer.from([side === 'user' ? 0 : 1]), data]);
}

/**
 * A browser-like WebRTC offer with an audio section.
 */
const OFFER = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=sendrecv\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';

test('only Codex implements voice; every other adapter returns the shared not-implemented result, never a fake session', async () => {
    assert.equal(voiceSupport(harnessPlugin('openai-codex')).implemented, true);
    for (const plugin of HARNESS_PLUGINS.filter((candidate) => candidate.id !== 'openai-codex')) {
        const support = voiceSupport(plugin);
        assert.equal(support.implemented, false, plugin.id);
        const availability = await support.inspect({ projectRoot: '.', env: {} });
        assert.equal(availability.state, 'not-implemented', plugin.id);
        assert.equal(availability.setup.kind, 'add-supported');
        await assert.rejects(support.start({ context: { projectRoot: '.', env: {} }, instructions: '', voiceInstructions: '', offer: OFFER, onEvent: () => undefined }), VoiceUnavailableError);
    }
    // Over SSH this computer's microphone is not available to the remote engine.
    assert.equal(remoteTerminal({ SSH_CONNECTION: '1.2.3.4 5 6.7.8.9 22' }), true);
    assert.equal(remoteTerminal({}), false);
    // Guidance names the applicable remedy instead of sending the user through setup again.
    assert.match(guidance([{ harness: 'claude-code', displayName: 'Claude Code', tool: 'claude', implemented: false, state: 'not-implemented', reason: 'x', checkedAt: 0, enabled: true, permitted: true }], '@Chatter', 'any'), /No registered harness supports realtime voice yet.*OPENAI_CODEX/);
    assert.match(guidance([{ harness: 'openai-codex', displayName: 'OpenAI Codex', tool: 'codex', implemented: true, state: 'unavailable', reason: 'Codex is not signed in with a ChatGPT account.', setup: { kind: 'login', text: 'Sign in with ChatGPT: codex login' }, checkedAt: 0, enabled: true, permitted: true }], '@Chatter', 'any'), /codex: Codex is not signed in.*codex login/);
    assert.match(guidance([{ harness: 'openai-codex', displayName: 'OpenAI Codex', tool: 'codex', implemented: true, state: 'ready', reason: 'Ready', checkedAt: 0, enabled: true, permitted: false }], '@Lawyer', 'CLAUDE_CODE'), /MODEL \(CLAUDE_CODE\) do not permit OpenAI Codex/);
});

test('Codex voice availability follows the installed release and the native account without opening a call', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk voice');
    const { env } = await fakeHarness(t, directory);
    const log = join(directory, 'voice.log');
    const codex = voiceSupport(harnessPlugin('openai-codex'));
    const context = (extra = {}) => ({ projectRoot: directory, env: { ...env, FAKE_CODEX_VOICE_LOG: log, OPENAI_API_KEY: 'sk-ambient', ...extra } });
    const ready = await codex.inspect(context());
    assert.equal(ready.state, 'ready', ready.reason);
    assert.equal(ready.version, '0.166.0');
    assert.equal(ready.entitlement, 'unverified', 'only a started call proves realtime access');
    assert.match(ready.account, /ChatGPT/);
    assert.equal(ready.features.dispatch, 'native');
    assert.equal(ready.features.transport, 'webrtc', 'a ChatGPT login negotiates WebRTC (Codex refuses its websocket transport)');
    const methods = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line).method);
    assert.ok(!methods.includes('thread/realtime/start') && !methods.includes('thread/start'), 'inspection opens no paid call');
    assert.equal((await codex.inspect(context({ FAKE_CODEX_VOICE: 'old' }))).setup.kind, 'update');
    const apiKey = await codex.inspect(context({ FAKE_CODEX_VOICE: 'api-key' }));
    assert.equal(apiKey.setup.kind, 'login');
    assert.match(apiKey.reason, /never falls back to API billing/);
    assert.equal((await codex.inspect(context({ FAKE_CODEX_SIGNED_OUT: '1' }))).setup.kind, 'login');
    const empty = join(directory, 'empty');
    await mkdir(empty);
    assert.equal((await codex.inspect({ projectRoot: directory, env: { ...env, PATH: empty, Path: empty } })).setup.kind, 'install');
    // The account refuses realtime: an entitlement problem, not a reinstall loop.
    const denied = await codex.start({ context: context({ FAKE_CODEX_VOICE: 'denied' }), instructions: 'x', voiceInstructions: 'y', offer: OFFER, onEvent: () => undefined }).then(
        () => assert.fail('a refused call never pretends to start'),
        (error) => error,
    );
    assert.ok(denied instanceof VoiceUnavailableError);
    assert.equal(denied.availability.setup.kind, 'entitlement');
    // A started call: realtime v3 over WebRTC with the page's offer, the chat history seeded, the answer for the page.
    const events = [];
    const session = await codex.start({ context: context(), instructions: 'Backing instructions', voiceInstructions: 'Voice instructions', offer: OFFER, history: [{ role: 'user', text: 'Earlier question' }, { role: 'assistant', text: 'Earlier answer' }], onEvent: (event) => events.push(event) });
    assert.match(session.answer, /fake-answer/);
    assert.equal(session.dispatch, 'native');
    await waitFor(() => events.some((event) => event.type === 'transcript' && event.role === 'assistant'), { timeoutMs: 10_000, message: 'transcripts' });
    assert.deepEqual(events.filter((event) => event.type === 'transcript').map((event) => [event.role, event.text]), [['user', 'Ahoj, jaký je stav projektu?'], ['assistant', 'Všechno běží podle plánu.']]);
    assert.ok(events.some((event) => event.type === 'usage' && event.usage.totalTokens === 120));
    await session.supplyContext('A typed message.');
    await session.end();
    await session.end();
    const log2 = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    const start = log2.findLast((entry) => entry.method === 'thread/realtime/start' && entry.params.transport.sdp === OFFER);
    assert.equal(start.params.version, 'v3');
    assert.deepEqual(start.params.initialItems, [{ role: 'user', text: 'Earlier question' }, { role: 'assistant', text: 'Earlier answer' }]);
    assert.equal(log2.find((entry) => entry.method === 'thread/start' && entry.params.developerInstructions === 'Backing instructions').params.sandbox, 'read-only');
    assert.ok(log2.some((entry) => entry.method === 'thread/realtime/appendText' && entry.params.role === 'developer'), 'context is quiet, never a new user turn');
    assert.equal(log2.filter((entry) => entry.method === 'thread/realtime/stop').length >= 1, true);
});

/** Waits a little (lets batched relay traffic arrive). */
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test('temporary feature server: loopback, single-use invitation redeemed only by the handshake, host/origin checks, one owner, recovery and cleanup', async () => {
    const states = [];
    const received = [];
    const surface = await FeatureSurface.start({
        page: { title: 'Test surface', style: '', body: '<main>Surface body</main>', script: 'void 0;' },
        reattachMs: 2_000,
        livenessMs: 900,
        onMessage: (message) => received.push(message),
        onBinary: (data) => received.push(['binary', data.length]),
        onState: (state, detail) => states.push([state, Boolean(detail.recovered)]),
    });
    try {
        assert.match(surface.url, /^http:\/\/127\.0\.0\.1:\d+\/#t=[\w-]{20,}$/, 'an OS-allocated loopback port; the invitation lives in the fragment');
        const token = new URL(surface.url).hash;
        // A preview or prefetch fetches the page (the fragment never reaches the server): nothing is redeemed.
        const page = await fetch(surface.url);
        assert.equal(page.status, 200);
        assert.match(page.headers.get('content-security-policy'), new RegExp(`default-src 'none'.*connect-src ws://127\\.0\\.0\\.1:${surface.port}`));
        assert.equal(page.headers.get('cache-control'), 'no-store');
        assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
        const html = await page.text();
        assert.match(html, /Surface body/);
        assert.ok(!html.includes(token.slice(3)), 'the page carries no invitation');
        assert.equal(surface.state, 'waiting');
        // DNS-rebound host names, other paths and methods, wrong origins and paths are refused.
        assert.equal((await new Promise((resolve) => connect(surface.port, '127.0.0.1').on('data', (chunk) => resolve(Number(/HTTP\/1\.1 (\d+)/.exec(chunk.toString())[1]))).end(`GET / HTTP/1.1\r\nHost: evil.example:${surface.port}\r\n\r\n`))), 421);
        assert.equal((await fetch(new URL('/api/status', surface.url))).status, 404);
        assert.equal((await fetch(surface.url.split('#')[0], { method: 'POST' })).status, 405);
        assert.equal((await surfaceClient(surface.url, { origin: 'http://evil.example' })).status, 403);
        assert.equal((await surfaceClient(surface.url, { host: `localhost:${surface.port}` })).status, 403);
        assert.equal((await surfaceClient(surface.url, { path: '/other' })).status, 403);
        assert.equal((await surfaceClient(surface.url, { token: 'wrong-token-value-wrong-token' })).welcomed, false);
        // Simultaneous redemptions: exactly one page gets the session.
        const [one, two] = await Promise.all([surfaceClient(surface.url), surfaceClient(surface.url)]);
        assert.equal([one, two].filter((client) => client.welcomed).length, 1, 'the invitation is redeemed once');
        const owner = one.welcomed ? one : two;
        await waitFor(() => surface.attached, { timeoutMs: 2_000, message: 'attached' });
        owner.sendText({ type: 'ping-from-page' });
        owner.sendBinary(Buffer.from([1, 2, 3]));
        await waitFor(() => received.length === 2, { timeoutMs: 2_000, message: 'page data' });
        assert.deepEqual(received, [{ type: 'ping-from-page' }, ['binary', 3]]);
        surface.send({ type: 'to-page' });
        await waitFor(() => owner.messages.some((message) => message.type === 'to-page'), { timeoutMs: 2_000, message: 'owner data' });
        // The original URL cannot attach another page; a duplicated tab with the copied session grant is refused too.
        assert.equal((await surfaceClient(surface.url)).welcomed, false);
        assert.equal((await surfaceClient(surface.url, { session: owner.session })).welcomed, false, 'no concurrent owner');
        assert.throws(() => surface.retry(), /attached/);
        // A transient loss recovers with the scoped session grant of the same page.
        owner.close();
        await waitFor(() => surface.state === 'detached', { timeoutMs: 2_000, message: 'detached' });
        const recovered = await surfaceClient(surface.url, { session: owner.session });
        assert.equal(recovered.welcomed, true);
        await waitFor(() => states.some(([state, again]) => state === 'attached' && again), { timeoutMs: 2_000, message: 'recovered' });
        // A backgrounded page answers pings and keeps its session; a page that stops answering is lost in bounded time.
        await pause(1_500);
        assert.equal(surface.attached, true, 'a live idle page stays attached');
        recovered.close();
        await waitFor(() => !surface.attached, { timeoutMs: 2_000, message: 'detached again' });
        const silent = await surfaceClient(surface.url, { session: owner.session, pong: false });
        assert.equal(silent.welcomed, true);
        await silent.closed;
        assert.equal(surface.state, 'detached', 'an unanswered page counts as lost');
        // After the reattach window the old grant is revoked; only an explicit retry issues a fresh link.
        await pause(2_600);
        assert.equal((await surfaceClient(surface.url, { session: owner.session })).welcomed, false);
        const fresh = surface.retry();
        assert.notEqual(fresh, surface.url.replace(/#.*/, token));
        assert.equal((await surfaceClient(fresh)).welcomed, true);
        // Closing tells the page why, revokes it and releases the port.
        const last = owner;
        await surface.close('Ended by its owner.');
        assert.equal(surface.state, 'closed');
        await assert.rejects(fetch(surface.url));
        void last;
    } finally {
        await surface.close();
    }
    // An unused invitation expires.
    const expiring = await FeatureSurface.start({ page: { title: 't', style: '', body: '', script: '' }, invitationMs: 300, onMessage: () => undefined, onState: (state) => states.push([state, false]) });
    try {
        await waitFor(() => expiring.state === 'expired', { timeoutMs: 6_000, message: 'expiry' });
        assert.equal((await surfaceClient(expiring.url)).welcomed, false);
        assert.equal((await surfaceClient(expiring.retry())).welcomed, true, 'a retry issues a working link');
    } finally {
        await expiring.close();
    }
});

/**
 * The terminal's media relay of a call, with the engine's call operations applied directly (as `VoiceCalls.media`).
 */
async function relayFor(call, onState = () => undefined) {
    return await VoiceSurfaceRelay.open({
        agent: call.agent,
        chat: call.chat,
        channel: {
            media: async (input) => {
                if (input.attach) call.mediaAttached();
                for (const item of input.items ?? []) {
                    if (item.kind === 'message') call.mediaMessage(item.message);
                    else call.mediaAudio(item.side, Buffer.from(item.data, 'base64'), item.rate);
                }
                if (input.detach) call.mediaDetached(typeof input.detach === 'string' ? input.detach : undefined);
            },
            events: async (after) => await call.mediaEvents(after, 1_000),
        },
        onState,
    });
}

test('voice media page: one surface page without composer, project API or socket address of its own', () => {
    const page = voiceFeaturePage({ agent: 'Accountant', chat: 'Invoices', hint: 'Controls are in your terminal.' });
    assert.match(page.body, /Allow microphone and sound/);
    assert.doesNotMatch(`${page.body}${page.script}`, /<textarea|<input|<form|\/api\/|new WebSocket/i, 'no composer, form, project API or own transport');
    assert.match(page.script, /surface\.send/);
});

test('voice call: page offer negotiates once per page, attributed transcripts and recordings in the same Book, mute, barge-in, untranscribed speech and closure', async (t) => {
    const project = projectAt(await temporaryDirectory(t, 'ptbk voice call'));
    const store = new ChatStore(project, { timeZone: 'UTC' });
    const created = await store.create({ name: 'Invoices', members: ['@User', '@Accountant'], status: 'open', messages: [{ sender: '@User', text: 'Hello.' }, { sender: '@Accountant', text: 'Hi, how can I help?' }] });
    const name = created.chat.name;
    const kept = [];
    const sessions = [];
    let emit;
    const host = {
        connect: async (offer, onEvent) => {
            emit = onEvent;
            const session = { offer, ended: 0, dispatch: 'native', answer: `answer-${sessions.length + 1}`, supplyContext: async () => undefined, end: async () => void session.ended++ };
            sessions.push(session);
            return session;
        },
        append: async (chat, role, text) => (await store.append(chat, { sender: role === 'user' ? '@User' : '@Accountant', text })).chat.messages.length,
        record: async (chat, message, segments) => ({ problems: (await store.recordAudio(chat, message, segments)).archive.problems }),
        keepUntranscribed: async (_chat, segment) => {
            kept.push(segment);
            return `untranscribed/${segment.id}.wav`;
        },
        onChange: () => undefined,
        log: () => undefined,
    };
    const call = new VoiceCall(name, 'Accountant', 'openai-codex', 'codex', host, { pageGraceMs: 300, leaseMs: 60_000 });
    const grant = call.open('terminal-1');
    assert.ok(call.authorized(grant) && !call.authorized('other'), 'one scoped media grant');
    assert.equal(call.view().state, 'awaiting-browser', 'the call waits for its page');
    const relay = await relayFor(call);
    const page = await surfaceClient(relay.url);
    assert.equal(page.welcomed, true);
    page.sendText({ type: 'format', sampleRate: 24_000 });
    page.sendText({ type: 'offer', sdp: OFFER });
    await waitFor(() => page.messages.some((message) => message.type === 'answer'), { timeoutMs: 5_000, message: 'the answer' });
    assert.equal(page.messages.find((message) => message.type === 'answer').sdp, 'answer-1');
    assert.equal(sessions[0].offer, OFFER);
    assert.equal(call.view().state, 'awaiting-browser', 'never Listening before the microphone is live');
    page.sendText({ type: 'page', mic: 'live', playback: 'ok' });
    await waitFor(() => call.view().state === 'listening', { timeoutMs: 5_000, message: 'listening' });
    // The user speaks: recorded; while muted nothing is recorded (the page disables its track).
    page.sendBinary(frame('user'));
    await pause(500);
    call.control('mute-mic');
    await waitFor(() => page.messages.some((message) => message.type === 'state' && message.view.micMuted), { timeoutMs: 5_000, message: 'mute reaches the page' });
    page.sendBinary(frame('user', pcm().fill(0x7f)));
    await pause(500);
    call.control('unmute-mic');
    page.sendBinary(frame('user'));
    await pause(500);
    // Provisional captions are never messages; the final transcript is one message by the real speaker.
    emit({ type: 'caption', role: 'user', delta: 'Ahoj, jaký' });
    assert.equal(call.view().captions.user, 'Ahoj, jaký');
    await new Promise((resolve) => setTimeout(resolve, 100));
    emit({ type: 'transcript', role: 'user', text: 'Ahoj, jaký je stav?' });
    page.sendText({ type: 'output', state: 'speaking' });
    page.sendBinary(frame('agent'));
    await pause(500);
    emit({ type: 'caption', role: 'assistant', delta: 'Všechno' });
    emit({ type: 'transcript', role: 'assistant', text: 'Všechno běží podle plánu.' });
    await waitFor(async () => (await store.find(name)).chat.messages.length === 4, { timeoutMs: 5_000, message: 'both utterances saved' });
    assert.equal(call.view().state, 'speaking');
    // Both spoken messages are marked at once; the reply's recording still finalizes while it plays.
    await waitFor(() => call.view().spoken?.[0]?.recording === 'saved', { timeoutMs: 5_000, message: 'the user recording bound' });
    assert.deepEqual(call.view().spoken, [{ message: 3, recording: 'saved' }, { message: 4, recording: 'finalizing' }]);
    // The user speaks over the answer: the provider cuts it off; the reply's audio is marked interrupted.
    page.sendText({ type: 'barge-in' });
    page.sendText({ type: 'output', state: 'idle' });
    await waitFor(async () => (await store.find(name)).chat.messages[3].audio?.length === 1, { timeoutMs: 5_000, message: 'reply audio' });
    await waitFor(() => call.view().spoken[1].recording === 'saved', { timeoutMs: 5_000, message: 'the reply recording state' });
    const { chat } = await store.find(name);
    assert.deepEqual(chat.messages.slice(2).map((message) => [message.sender, message.text]), [['@User', 'Ahoj, jaký je stav?'], ['@Accountant', 'Všechno běží podle plánu.']]);
    assert.equal(chat.messages[2].audio[0].status, 'complete');
    assert.equal(chat.messages[3].audio[0].status, 'interrupted');
    assert.equal(chat.messages[3].audio[0].timing.call, call.id);
    const userWav = await readFile(join(project.root, chat.messages[2].audio[0].path));
    assert.equal(userWav.subarray(0, 4).toString(), 'RIFF');
    assert.equal(userWav.length, 44 + 2 * 4096, 'two delivered chunks; the muted one is not recorded');
    assert.match(await readFile((await store.find(name)).path, 'utf8'), /CHAT MESSAGE AUDIO/);
    assert.equal(call.view().accepted, 2);
    // A reload: the old page goes, the same tab recovers with its session, and its new offer replaces the provider
    // session of the same call.
    page.close();
    await waitFor(() => call.view().state === 'reconnecting', { timeoutMs: 5_000, message: 'reconnecting' });
    const reloaded = await surfaceClient(relay.url, { session: page.session });
    assert.equal(reloaded.welcomed, true);
    reloaded.sendText({ type: 'offer', sdp: OFFER });
    await waitFor(() => reloaded.messages.some((message) => message.type === 'answer'), { timeoutMs: 5_000, message: 'second answer' });
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].ended, 1, 'one input owner: the previous provider session ended first');
    reloaded.sendText({ type: 'page', mic: 'live', playback: 'ok' });
    // Speech without a transcript is kept, never bound to invented words.
    reloaded.sendBinary(frame('user'));
    await pause(500);
    // Closing the page ends the call after its short grace; the chat stays, and the temporary listener is released.
    reloaded.close();
    await waitFor(() => call.over, { timeoutMs: 5_000, message: 'call end' });
    await waitFor(() => relay.surfaceState === 'closed', { timeoutMs: 5_000, message: 'the relay closes with the call' });
    await assert.rejects(fetch(relay.url));
    assert.equal(call.view().state, 'ended');
    assert.equal(sessions[1].ended, 1, 'the provider session is released');
    assert.equal(kept.length, 1);
    assert.match(call.view().archive.join(' '), /Speech without a transcript is kept/);
    assert.equal((await store.find(name)).chat.messages.length, 4, 'no message was invented');
    await call.end('again');
    assert.equal(sessions[1].ended, 1, 'ending is idempotent');
});

test('voice call: a refused provider fails the call with its reason; the chat is untouched', async () => {
    const host = { connect: async () => { throw new Error('Codex realtime voice was refused: not available for this plan. This ChatGPT account does not offer realtime voice.'); }, append: async () => 1, record: async () => ({ problems: [] }), keepUntranscribed: async () => undefined, onChange: () => undefined, log: () => undefined };
    const call = new VoiceCall('Chat', 'Chatter', 'openai-codex', 'codex', host, { pageGraceMs: 10_000, leaseMs: 60_000 });
    call.open();
    const relay = await relayFor(call);
    const page = await surfaceClient(relay.url);
    page.sendText({ type: 'offer', sdp: OFFER });
    await page.closed;
    assert.equal(call.view().state, 'failed');
    assert.match(call.view().problem, /refused.*does not offer realtime voice/);
    assert.equal(page.messages.at(-1).type, 'ended');
    assert.match(page.messages.at(-1).reason, /refused/);
});

test('voice call: a terminal that stops renewing its lease ends the call in bounded time', async () => {
    let ended = false;
    const host = { connect: async () => ({ dispatch: 'native', answer: 'v=0', supplyContext: async () => undefined, end: async () => void (ended = true) }), append: async () => 1, record: async () => ({ problems: [] }), keepUntranscribed: async () => undefined, onChange: () => undefined, log: () => undefined };
    const call = new VoiceCall('Chat', 'Chatter', 'openai-codex', 'codex', host, { pageGraceMs: 10_000, leaseMs: 300 });
    call.open();
    const relay = await relayFor(call);
    const page = await surfaceClient(relay.url);
    page.sendText({ type: 'offer', sdp: OFFER });
    call.heartbeat();
    await waitFor(() => call.over, { timeoutMs: 5_000, message: 'lease expiry' });
    assert.equal(ended, true);
    assert.equal(call.view().state, 'ended');
    await page.closed;
    await waitFor(() => relay.surfaceState === 'closed', { timeoutMs: 5_000, message: 'listener released' });
});

/** Sends one control request to the project's engine. */
async function control(project, method, params = {}) {
    const record = await readProcessRecord(projectAt(project));
    return await new ControlClient(projectAt(project), record).request(method, params, 60_000);
}

test('engine: voice in an existing chat during Pause, native dispatch without a second text reply, committed recordings, and Stop ends it', { timeout: 240_000 }, async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: 'process.exit(0);\n' });
    const voiceLog = join(dirname(log), 'voice.log');
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '0', FAKE_CODEX_VOICE_LOG: voiceLog, FAKE_CODEX_VOICE_DELAY_MS: '1500', PTBK_VOICE_PAGE_GRACE_MS: '60000' };
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0);
    const asked = await ptbk(['chat', 'Hello, can we talk?', '--raw'], { cwd: project, env });
    assert.equal(asked.code, 0, asked.output);
    const listed = JSON.parse((await ptbk(['chat', '--list', '--json'], { cwd: project, env })).stdout);
    const name = (listed.chats ?? listed)[0].name;
    const turns = async () => (existsSync(log) ? (await readFile(log, 'utf8')).trim().split('\n').filter((line) => JSON.parse(line).chat).length : 0);
    await waitFor(async () => (await control(project, 'chat-get', { name })).messages.length >= 2, { message: 'the written reply' });
    const before = await turns();

    const started = await control(project, 'voice-start', { name, client: 'terminal-a' });
    assert.equal(started.url, undefined, 'the engine serves no media page itself');
    assert.equal(started.call.harness, 'openai-codex');
    // Every client sees the call; only the controlling terminal gets its media grant.
    const detail = await control(project, 'chat-get', { name });
    assert.equal(detail.voice.id, started.call.id);
    assert.ok(!JSON.stringify(detail).includes(started.grant), 'the media grant is not shared');
    // Starting again returns the live call to its own terminal, never a second paid session or input owner.
    assert.equal((await control(project, 'voice-start', { name, client: 'terminal-a' })).call.id, started.call.id);
    await assert.rejects(control(project, 'voice-start', { name, client: 'terminal-b' }), /already live/);
    await assert.rejects(control(project, 'voice-media', { name, grant: 'not-the-grant', items: [] }), /belongs to this media surface/);
    // The terminal's own temporary server relays the page; the project HTTP server is not involved.
    const relay = await VoiceSurfaceRelay.open({
        agent: started.call.agent,
        chat: name,
        channel: {
            media: async (input) => await control(project, 'voice-media', { name, grant: started.grant, ...input }),
            events: async (after) => await control(project, 'voice-media-events', { name, grant: started.grant, after, wait: 5_000 }),
        },
        onState: () => undefined,
    });
    t.after(async () => await relay.close());
    const page = await surfaceClient(relay.url);
    assert.equal(page.welcomed, true);
    page.sendText({ type: 'format', sampleRate: 24_000 });
    page.sendText({ type: 'offer', sdp: OFFER });
    await waitFor(() => page.messages.some((message) => message.type === 'answer'), { message: 'the provider answer for the page' });
    page.sendText({ type: 'page', mic: 'live', playback: 'ok', rtc: 'connected' });
    for (let index = 0; index < 4; index++) page.sendBinary(frame('user'));
    await pause(600);
    await waitFor(async () => (await control(project, 'chat-get', { name })).messages.some((message) => message.text === 'Všechno běží podle plánu.'), { message: 'the spoken exchange in the chat' });
    await control(project, 'voice-heartbeat', { name });
    page.sendText({ type: 'output', state: 'speaking' });
    for (let index = 0; index < 4; index++) page.sendBinary(frame('agent'));
    await pause(600);
    page.sendText({ type: 'output', state: 'idle' });
    const book = async () => await readFile(join(project, 'chats', (await control(project, 'chat-get', { name })).summary.path.split('/').pop()), 'utf8').catch(async () => await readFile(join(project, (await control(project, 'chat-get', { name })).summary.path), 'utf8'));
    await waitFor(async () => ((await book()).match(/CHAT MESSAGE AUDIO/g) ?? []).length === 2, { message: 'both recordings bound' });
    const messages = (await control(project, 'chat-get', { name })).messages;
    const spoken = messages.slice(-2);
    assert.deepEqual(spoken.map((message) => message.text), ['Ahoj, jaký je stav projektu?', 'Všechno běží podle plánu.']);
    assert.match(spoken[0].sender, /User/);
    assert.doesNotMatch(spoken[1].sender, /User/, 'the agent speaks under its own name');
    // The native voice path accepted the question: no second, written reply is generated for it.
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    assert.equal(await turns(), before, 'no text reply ran for the spoken question');
    // The backing Codex thread: read-only, ephemeral, the chat agent's context and the chat's ptbk tools.
    const calls = (await readFile(voiceLog, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    const thread = calls.find((entry) => entry.method === 'thread/start');
    assert.equal(thread.params.sandbox, 'read-only');
    assert.equal(thread.params.ephemeral, true);
    assert.match(thread.params.developerInstructions, new RegExp(`\\{${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`));
    assert.match(thread.params.developerInstructions, /create_task/);
    assert.ok(thread.config['mcp_servers.ptbk.command'], 'the chat tools are loaded');
    assert.equal(thread.config.forced_login_method, '"chatgpt"');
    const start = calls.find((entry) => entry.method === 'thread/realtime/start');
    assert.equal(start.params.transport.type, 'webrtc');
    assert.equal(start.params.version, 'v3');
    assert.ok(start.params.initialItems.some((item) => item.role === 'user' && item.text === 'Hello, can we talk?'), 'the chat so far seeds the voice');
    // A typed message during the call reaches the voice session as context, once.
    await control(project, 'chat-send', { name, text: 'TYPED_DURING_CALL', via: 'test' });
    await waitFor(async () => (await readFile(voiceLog, 'utf8')).includes('TYPED_DURING_CALL'), { message: 'context delivery' });
    // Stop ends the call: page, provider session and the terminal's listener; recordings are committed with their
    // bindings.
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    await page.closed;
    assert.equal(page.messages.at(-1).type, 'ended');
    await waitFor(() => relay.surfaceState === 'closed', { timeoutMs: 20_000, message: 'the relay closes with the call' });
    assert.ok(calls.length && (await readFile(voiceLog, 'utf8')).includes('thread/realtime/stop'));
    const assets = (await git(project, ['ls-files', 'chats/_assets'])).trim().split('\n').filter(Boolean);
    assert.equal(assets.filter((file) => file.endsWith('.wav')).length, 2, 'both recordings are versioned');
    assert.match(await git(project, ['log', '--format=%B']), /Chat-Audio:/);
});

test('engine: voice before the first message of a new chat shares one creation with the first send; spoken messages are marked and replayable', { timeout: 240_000 }, async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: 'process.exit(0);\n' });
    const voiceLog = join(dirname(log), 'voice.log');
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '0', FAKE_CODEX_VOICE_LOG: voiceLog, FAKE_CODEX_VOICE_DELAY_MS: '1500', PTBK_VOICE_PAGE_GRACE_MS: '60000' };
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    t.after(async () => await ptbk(['stop', '--raw'], { cwd: project, env }).catch(() => undefined));
    const turns = async () => (existsSync(log) ? (await readFile(log, 'utf8')).trim().split('\n').filter((line) => line && JSON.parse(line).chat).length : 0);
    const before = await turns();
    // The new chat view prepares its ordinary Book for voice: concurrent and retried openings are one chat, with no
    // message and no reply.
    const [first, second] = await Promise.all([control(project, 'chat-open', { requestKey: 'view-1' }), control(project, 'chat-open', { requestKey: 'view-1' })]);
    assert.equal(first.name, second.name);
    const name = first.name;
    assert.equal((await control(project, 'chat-get', { name })).messages.length, 0, 'media setup leaves the history empty');
    assert.equal((await control(project, 'chat-list')).filter((chat) => chat.name === name).length, 1);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    assert.equal(await turns(), before, 'opening the chat dispatches nothing');
    assert.equal((await control(project, 'chat-get', { name })).messages.length, 0);

    const started = await control(project, 'voice-start', { name, client: 'desktop-window-1' });
    assert.equal(started.call.chat, name, 'the call is bound to the opened chat');
    const relay = await VoiceSurfaceRelay.open({
        agent: started.call.agent,
        chat: name,
        channel: {
            media: async (input) => await control(project, 'voice-media', { name, grant: started.grant, ...input }),
            events: async (after) => await control(project, 'voice-media-events', { name, grant: started.grant, after, wait: 5_000 }),
        },
        onState: () => undefined,
    });
    t.after(async () => await relay.close());
    const page = await surfaceClient(relay.url);
    page.sendText({ type: 'format', sampleRate: 24_000 });
    page.sendText({ type: 'offer', sdp: OFFER });
    await waitFor(() => page.messages.some((message) => message.type === 'answer'), { message: 'the provider answer for the page' });
    page.sendText({ type: 'page', mic: 'live', playback: 'ok', rtc: 'connected' });
    for (let index = 0; index < 4; index++) page.sendBinary(frame('user'));
    await pause(600);
    // The first message of the chat is the spoken one; while its recording finalizes it is already marked as speech.
    await waitFor(async () => (await control(project, 'chat-get', { name })).messages.length >= 2, { message: 'the spoken first exchange' });
    let detail = await control(project, 'chat-get', { name });
    assert.equal(detail.messages[0].text, 'Ahoj, jaký je stav projektu?');
    assert.match(detail.messages[0].sender, /User/);
    assert.deepEqual(detail.voice.spoken.map((entry) => entry.message), [1, 2]);
    page.sendText({ type: 'output', state: 'speaking' });
    for (let index = 0; index < 4; index++) page.sendBinary(frame('agent'));
    await pause(600);
    page.sendText({ type: 'output', state: 'idle' });
    await waitFor(async () => (await control(project, 'chat-get', { name })).voice.spoken.every((entry) => entry.recording === 'saved'), { message: 'both recordings bound' });
    assert.equal(await turns(), before, 'the native voice path answered; no text reply ran');
    // A first send from the same view (late, or retried) lands in the same Book as a typed message, once.
    const typed = await control(project, 'chat-create', { text: 'TYPED_IN_THE_SAME_VIEW', requestKey: 'view-1', via: 'test' });
    assert.equal(typed.name, name, 'voice start and first send share one creation');
    assert.equal((await control(project, 'chat-create', { text: 'TYPED_IN_THE_SAME_VIEW', requestKey: 'view-1', via: 'test' })).name, name);
    detail = await control(project, 'chat-get', { name });
    assert.equal(detail.messages.filter((message) => message.text === 'TYPED_IN_THE_SAME_VIEW').length, 1, 'a retry never sends twice');
    assert.equal(detail.messages[2].audio, undefined, 'a typed message during the call keeps its ordinary presentation');
    assert.equal(detail.messages[0].audio.length, 1);
    await waitFor(async () => (await readFile(voiceLog, 'utf8')).includes('TYPED_IN_THE_SAME_VIEW'), { message: 'the typed turn reaches the live call once' });
    // Replay over the project API is inspection only; availability is read-only and the API never starts a call.
    const { token, http } = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'process.json'), 'utf8'));
    const headers = { Authorization: `Bearer ${token}` };
    const base = http.url.replace(/\/$/, '');
    const replay = await fetch(`${base}/api/chats/${encodeURIComponent(name)}/audio?message=1&segment=0`, { headers });
    assert.equal(replay.status, 200, replay.status === 200 ? '' : await replay.text());
    assert.equal(replay.headers.get('content-type'), 'audio/wav');
    assert.equal(Buffer.from(await replay.arrayBuffer()).subarray(0, 4).toString(), 'RIFF');
    assert.equal((await fetch(`${base}/api/chats/${encodeURIComponent(name)}/audio?message=3&segment=0`, { headers })).status, 404, 'typed messages have no recording');
    const availability = await (await fetch(`${base}/api/chats/${encodeURIComponent(name)}/voice`, { headers })).json();
    assert.equal(availability.chat, name);
    assert.ok(!JSON.stringify(availability).includes(started.grant));
    assert.equal((await fetch(`${base}/.ptbk-desktop/voice?action=start&chat=x`)).status, 204, 'an intent reaching the engine changes nothing');
    const messages = (await control(project, 'chat-get', { name })).messages.length;
    await control(project, 'voice-control', { name, action: 'end' });
    await page.closed;
    assert.equal((await control(project, 'chat-get', { name })).messages.length, messages, 'ending voice keeps the history');
});
