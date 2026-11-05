import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { ChatStore } from '../dist/chats/store.js';
import { VoiceBridge } from '../dist/chats/voice-bridge.js';
import { VoiceCall } from '../dist/chats/voice-call.js';
import { HARNESS_PLUGINS, harnessPlugin } from '../dist/harness/registry.js';
import { VoiceUnavailableError, remoteTerminal, voiceSupport } from '../dist/harness/voice.js';
import { guidance } from '../dist/engine/voice-calls.js';
import { projectAt } from '../dist/project/workspace.js';
import { ControlClient } from '../dist/service/control.js';
import { readProcessRecord } from '../dist/service/records.js';
import { fakeHarness, git, initializedProject, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * A minimal WebSocket client standing in for the media page (masked client frames, as a browser sends them).
 */
async function mediaClient(url, { origin, path } = {}) {
    const page = new URL(url);
    const socket = connect(Number(page.port), '127.0.0.1');
    await new Promise((resolve, reject) => socket.once('connect', resolve).once('error', reject));
    socket.write(`GET ${path ?? `${page.pathname}/media`} HTTP/1.1\r\nHost: ${page.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\nOrigin: ${origin ?? page.origin}\r\n\r\n`);
    const client = { status: 0, messages: [], binary: [], closed: undefined };
    let buffer = Buffer.alloc(0);
    let headers = true;
    let finish;
    client.closed = new Promise((resolve) => (finish = resolve));
    socket.on('close', () => finish());
    socket.on('error', () => finish());
    const statusKnown = new Promise((resolve) => {
        socket.on('data', (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            if (headers) {
                const end = buffer.indexOf('\r\n\r\n');
                if (end < 0) return;
                client.status = Number(/^HTTP\/1\.1 (\d+)/.exec(buffer.subarray(0, end).toString())?.[1] ?? 0);
                buffer = buffer.subarray(end + 4);
                headers = false;
                resolve();
            }
            while (buffer.length >= 2) {
                const opcode = buffer[0] & 0x0f;
                let length = buffer[1] & 0x7f;
                let offset = 2;
                if (length === 126) {
                    if (buffer.length < 4) return;
                    length = buffer.readUInt16BE(2);
                    offset = 4;
                } else if (length === 127) {
                    if (buffer.length < 10) return;
                    length = Number(buffer.readBigUInt64BE(2));
                    offset = 10;
                }
                if (buffer.length < offset + length) return;
                const payload = buffer.subarray(offset, offset + length);
                buffer = buffer.subarray(offset + length);
                if (opcode === 0x1) client.messages.push(JSON.parse(payload.toString('utf8')));
                else if (opcode === 0x2) client.binary.push(Buffer.from(payload));
            }
        });
    });
    const frame = (opcode, payload) => {
        const mask = randomBytes(4);
        const masked = Buffer.from(payload);
        for (let index = 0; index < masked.length; index++) masked[index] ^= mask[index % 4];
        const header = masked.length < 126 ? Buffer.from([0x80 | opcode, 0x80 | masked.length]) : Buffer.concat([Buffer.from([0x80 | opcode, 0x80 | 126]), Buffer.from([masked.length >> 8, masked.length & 0xff])]);
        socket.write(Buffer.concat([header, mask, masked]));
    };
    client.sendText = (value) => frame(0x1, Buffer.from(JSON.stringify(value)));
    client.sendBinary = (data) => frame(0x2, data);
    client.close = () => {
        frame(0x8, Buffer.from([0x03, 0xe8]));
        socket.end();
    };
    await statusKnown;
    return client;
}

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

test('media bridge: private token and exact origin, one media owner, reload reattaches; no project operations', async () => {
    const events = [];
    const bridge = await VoiceBridge.start({ agent: 'Accountant', chat: 'Invoices' }, { onAudio: (side, data, rate) => events.push(['audio', side, data.length, rate]), onMessage: (message) => events.push(['message', message.type]), onAttached: () => events.push(['attached']), onDetached: () => events.push(['detached']) });
    try {
        assert.match(bridge.url, /^http:\/\/127\.0\.0\.1:\d+\/voice\/[\w-]{20,}$/);
        const page = await fetch(bridge.url);
        assert.equal(page.status, 200);
        const csp = page.headers.get('content-security-policy');
        assert.match(csp, /default-src 'none'/);
        assert.match(csp, new RegExp(`connect-src ws://127\\.0\\.0\\.1:${bridge.port}`));
        const html = await page.text();
        assert.match(html, /Allow microphone and sound/);
        assert.doesNotMatch(html, /<textarea|<input|<form|\/api\//i, 'no composer, form or project API');
        assert.equal((await fetch(bridge.url.replace(/\/voice\/.*/, '/voice/wrong'))).status, 404);
        assert.equal((await fetch(new URL('/api/status', bridge.url))).status, 404);
        assert.equal((await mediaClient(bridge.url, { origin: 'http://evil.example' })).status, 403);
        assert.equal((await mediaClient(bridge.url, { path: '/voice/wrong/media' })).status, 403);
        const first = await mediaClient(bridge.url);
        assert.equal(first.status, 101);
        await waitFor(() => events.some((event) => event[0] === 'attached'), { timeoutMs: 5_000, message: 'attach' });
        first.sendText({ type: 'format', sampleRate: 16_000 });
        first.sendBinary(frame('user'));
        first.sendBinary(frame('agent'));
        first.sendBinary(Buffer.from([7, 0, 0]));
        await waitFor(() => events.filter((event) => event[0] === 'audio').length === 2, { timeoutMs: 5_000, message: 'audio' });
        assert.deepEqual(events.filter((event) => event[0] === 'audio'), [['audio', 'user', 4096, 16_000], ['audio', 'agent', 4096, 16_000]], 'tagged recording frames; an unknown tag is dropped');
        // A duplicate tab gets no microphone or playback.
        const duplicate = await mediaClient(bridge.url);
        await duplicate.closed;
        assert.equal(duplicate.messages[0]?.type, 'duplicate');
        assert.equal(bridge.attached, true, 'the first page keeps the media');
        // Reload: the old page goes, the new one reattaches to the same call.
        first.close();
        await waitFor(() => events.some((event) => event[0] === 'detached'), { timeoutMs: 5_000, message: 'detach' });
        const reloaded = await mediaClient(bridge.url);
        assert.equal(reloaded.status, 101);
        await waitFor(() => events.filter((event) => event[0] === 'attached').length === 2, { timeoutMs: 5_000, message: 'reattach' });
        bridge.send({ type: 'answer', sdp: 'v=0' });
        await waitFor(() => reloaded.messages.some((message) => message.type === 'answer'), { timeoutMs: 5_000, message: 'answer' });
        await bridge.close('Ended from the terminal.');
        await reloaded.closed;
        assert.equal(reloaded.messages.at(-1).type, 'ended');
        assert.equal((await fetch(bridge.url).catch(() => undefined))?.status ?? 'closed', 'closed', 'the bridge ends with its call');
    } finally {
        await bridge.close();
    }
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
    const url = await call.openBridge();
    assert.equal(call.view().state, 'awaiting-browser', 'the call waits for its page');
    const page = await mediaClient(url);
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
    call.control('mute-mic');
    await waitFor(() => page.messages.some((message) => message.type === 'state' && message.view.micMuted), { timeoutMs: 5_000, message: 'mute reaches the page' });
    page.sendBinary(frame('user', pcm().fill(0x7f)));
    call.control('unmute-mic');
    page.sendBinary(frame('user'));
    // Provisional captions are never messages; the final transcript is one message by the real speaker.
    emit({ type: 'caption', role: 'user', delta: 'Ahoj, jaký' });
    assert.equal(call.view().captions.user, 'Ahoj, jaký');
    await new Promise((resolve) => setTimeout(resolve, 100));
    emit({ type: 'transcript', role: 'user', text: 'Ahoj, jaký je stav?' });
    page.sendText({ type: 'output', state: 'speaking' });
    page.sendBinary(frame('agent'));
    emit({ type: 'caption', role: 'assistant', delta: 'Všechno' });
    emit({ type: 'transcript', role: 'assistant', text: 'Všechno běží podle plánu.' });
    await waitFor(async () => (await store.find(name)).chat.messages.length === 4, { timeoutMs: 5_000, message: 'both utterances saved' });
    assert.equal(call.view().state, 'speaking');
    // The user speaks over the answer: the provider cuts it off; the reply's audio is marked interrupted.
    page.sendText({ type: 'barge-in' });
    page.sendText({ type: 'output', state: 'idle' });
    await waitFor(async () => (await store.find(name)).chat.messages[3].audio?.length === 1, { timeoutMs: 5_000, message: 'reply audio' });
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
    // A reload: the old page goes, the new page's offer replaces the provider session of the same call.
    page.close();
    await waitFor(() => call.view().state === 'reconnecting', { timeoutMs: 5_000, message: 'reconnecting' });
    const reloaded = await mediaClient(url);
    reloaded.sendText({ type: 'offer', sdp: OFFER });
    await waitFor(() => reloaded.messages.some((message) => message.type === 'answer'), { timeoutMs: 5_000, message: 'second answer' });
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].ended, 1, 'one input owner: the previous provider session ended first');
    reloaded.sendText({ type: 'page', mic: 'live', playback: 'ok' });
    // Speech without a transcript is kept, never bound to invented words.
    reloaded.sendBinary(frame('user'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Closing the page ends the call after its short grace; the chat stays.
    reloaded.close();
    await waitFor(() => call.over, { timeoutMs: 5_000, message: 'call end' });
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
    const url = await call.openBridge();
    const page = await mediaClient(url);
    page.sendText({ type: 'offer', sdp: OFFER });
    await page.closed;
    assert.equal(call.view().state, 'failed');
    assert.match(call.view().problem, /refused.*does not offer realtime voice/);
    assert.equal(page.messages.at(-1).type, 'ended');
});

test('voice call: a terminal that stops renewing its lease ends the call in bounded time', async () => {
    let ended = false;
    const host = { connect: async () => ({ dispatch: 'native', answer: 'v=0', supplyContext: async () => undefined, end: async () => void (ended = true) }), append: async () => 1, record: async () => ({ problems: [] }), keepUntranscribed: async () => undefined, onChange: () => undefined, log: () => undefined };
    const call = new VoiceCall('Chat', 'Chatter', 'openai-codex', 'codex', host, { pageGraceMs: 10_000, leaseMs: 300 });
    const url = await call.openBridge();
    const page = await mediaClient(url);
    page.sendText({ type: 'offer', sdp: OFFER });
    call.heartbeat();
    await waitFor(() => call.over, { timeoutMs: 5_000, message: 'lease expiry' });
    assert.equal(ended, true);
    assert.equal(call.view().state, 'ended');
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

    const started = await control(project, 'voice-start', { name });
    assert.match(started.url, /^http:\/\/127\.0\.0\.1:\d+\/voice\//);
    assert.equal(started.call.harness, 'openai-codex');
    // Every client sees the call; only the controlling terminal gets its private page URL.
    const detail = await control(project, 'chat-get', { name });
    assert.equal(detail.voice.id, started.call.id);
    assert.ok(!JSON.stringify(detail).includes(new URL(started.url).pathname), 'the private page URL is not shared');
    // Starting again returns the live call, never a second paid session.
    assert.equal((await control(project, 'voice-start', { name })).call.id, started.call.id);

    const page = await mediaClient(started.url);
    page.sendText({ type: 'format', sampleRate: 24_000 });
    page.sendText({ type: 'offer', sdp: OFFER });
    await waitFor(() => page.messages.some((message) => message.type === 'answer'), { message: 'the provider answer for the page' });
    page.sendText({ type: 'page', mic: 'live', playback: 'ok', rtc: 'connected' });
    for (let index = 0; index < 4; index++) page.sendBinary(frame('user'));
    await waitFor(async () => (await control(project, 'chat-get', { name })).messages.some((message) => message.text === 'Všechno běží podle plánu.'), { message: 'the spoken exchange in the chat' });
    await control(project, 'voice-heartbeat', { name });
    page.sendText({ type: 'output', state: 'speaking' });
    for (let index = 0; index < 4; index++) page.sendBinary(frame('agent'));
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
    // Stop ends the call: page, provider session and bridge; recordings are committed with their bindings.
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    await page.closed;
    assert.equal(page.messages.at(-1).type, 'ended');
    assert.ok(calls.length && (await readFile(voiceLog, 'utf8')).includes('thread/realtime/stop'));
    const assets = (await git(project, ['ls-files', 'chats/_assets'])).trim().split('\n').filter(Boolean);
    assert.equal(assets.filter((file) => file.endsWith('.wav')).length, 2, 'both recordings are versioned');
    assert.match(await git(project, ['log', '--format=%B']), /Chat-Audio:/);
});
