import assert from 'node:assert/strict';
import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
import { chmod, mkdir, readdir, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:https';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { AppConnection, storedAppView } from '../dist/app/connection.js';
import { encodeBase64Url } from '../dist/app/encoding.js';
import { buildHeartbeat, sendHeartbeat, signHeartbeat } from '../dist/app/heartbeat.js';
import { deriveEngineFingerprint, deriveEngineId, loadEngineIdentity } from '../dist/app/identity.js';
import { forgetRegistration, readRegistration, registerEngine, signRegistration, storeRegistration } from '../dist/app/registration.js';
import { appSettings } from '../dist/app/settings.js';
import { SIGNING_CONTEXT, createEngineSigner, signingInput } from '../dist/app/signing.js';
import { CLOSE_CODE, FRAME_TYPE, decodeFrame, encodeFrame } from '../dist/app/tunnel/frames.js';
import { checkTunnelReady, parseRelayMessage, tunnelAuthInput } from '../dist/app/tunnel/handshake.js';
import { appDetailLines, appPlainLines, appSummaryLine, appTileLines } from '../dist/ui/app-connection.js';
import { createStyle, stripAnsi } from '../dist/ui/ansi.js';
import { fakeHarness, initializedProject, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';

/** Golden vectors of the App contract (copied from webgptorg/app, see the fixture README). */
const VECTORS = new URL('./fixtures/app-protocol/', import.meta.url);
const signed = JSON.parse(await readFile(new URL('signed-message-vectors.json', VECTORS), 'utf8'));
const fingerprints = JSON.parse(await readFile(new URL('fingerprint-vectors.json', VECTORS), 'utf8'));
const tunnel = JSON.parse(await readFile(new URL('tunnel-vectors.json', VECTORS), 'utf8'));

/** The test CA and leaf for `dashboard.localhost` and `relay-N.localhost`. */
const TLS = new URL('./fixtures/app-tls/', import.meta.url);
const CA_PATH = new URL('ca.pem', TLS);
const ca = await readFile(CA_PATH, 'utf8');
const tls = { ca };

const POSIX = process.platform !== 'win32';
const hex = (bytes) => Buffer.from(bytes).toString('hex');
const fromHex = (text) => new Uint8Array(Buffer.from(text, 'hex'));

/** An Ed25519 public key object from its raw 32 bytes. */
function publicKeyOf(raw) {
    return createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(raw)]), format: 'der', type: 'spki' });
}

/** An engine identity from a raw Ed25519 seed (the vectors' published RFC 8032 test key). */
async function identityFromSeed(seedHex, publicKeyHex) {
    const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(seedHex, 'hex')]);
    const publicKey = fromHex(publicKeyHex);
    const engineId = deriveEngineId(publicKey);
    return { signer: await createEngineSigner(new Uint8Array(pkcs8), publicKey), engineId, fingerprint: deriveEngineFingerprint(engineId) };
}

/** A link code in the contract's alphabet. */
const linkCode = (letter) => `${letter.repeat(25)}a`;

test('golden vectors: registration and heartbeat signatures, engine ID and fingerprint', async () => {
    const { key, registration, heartbeat } = signed;
    const identity = await identityFromSeed(key.seedHex, key.publicKeyHex);
    assert.equal(identity.engineId, key.engineId);
    const request = registration.request;
    assert.equal(hex(signingInput(SIGNING_CONTEXT.register, '1', request.linkCode, identity.signer.publicKey, request.engineVersion, request.mode)), registration.signingInputHex);
    assert.equal(await signRegistration(identity, request.linkCode, request.engineVersion, request.mode), JSON.stringify(request), 'the exact request bytes, signature included');

    const fields = JSON.parse(heartbeat.body);
    const body = buildHeartbeat(fields);
    assert.equal(new TextDecoder().decode(body), heartbeat.body, 'the exact body in the schema order');
    assert.equal(createHash('sha256').update(body).digest('hex'), heartbeat.bodySha256Hex);
    assert.equal(hex(signingInput(SIGNING_CONTEXT.heartbeat, createHash('sha256').update(body).digest())), heartbeat.signingInputHex);
    assert.equal(await signHeartbeat(identity, body), heartbeat.signatureHeader);

    for (const vector of fingerprints.vectors) {
        const fingerprint = deriveEngineFingerprint(vector.engineId);
        assert.equal(fingerprint.code, vector.code, vector.engineId);
        assert.equal(fingerprint.formatted, vector.formatted, vector.engineId);
        for (let row = 0; row < 5; row++) {
            for (let column = 0; column < 5; column++) assert.equal(fingerprint.cells[row][column], vector.patternBits[row * 3 + Math.min(column, 4 - column)] === '1', `${vector.engineId} cell ${row},${column}`);
        }
    }
});

test('golden vectors: tunnel handshake signing input, downgrade checks and the frame codec', async () => {
    const { handshake, frames } = tunnel;
    const identity = await identityFromSeed(handshake.seed, handshake.publicKey);
    assert.equal(identity.engineId, handshake.engineId);
    const challenge = parseRelayMessage(handshake.challenge);
    assert.equal(challenge?.type, 'challenge');
    const auth = JSON.parse(handshake.auth);
    const input = tunnelAuthInput(challenge, auth.engineId, { version: auth.version, versions: auth.protocolVersions, features: auth.features });
    assert.equal(hex(input), handshake.signingInput);
    assert.equal(hex(await identity.signer.sign(input)), handshake.signature);
    assert.equal(encodeBase64Url(fromHex(handshake.signature)), auth.sig);
    const ready = parseRelayMessage(handshake.ready);
    assert.equal(checkTunnelReady(challenge, auth, ready), true);
    for (const item of handshake.mismatchedReady) assert.equal(checkTunnelReady(challenge, auth, parseRelayMessage(item.ready)), false, item.id);
    const key = publicKeyOf(fromHex(handshake.publicKey));
    for (const item of handshake.invalidAuth) {
        const changedChallenge = parseRelayMessage(item.challenge);
        const changedAuth = JSON.parse(item.auth);
        const changedInput = tunnelAuthInput(changedChallenge, changedAuth.engineId, { version: changedAuth.version, versions: changedAuth.protocolVersions, features: changedAuth.features });
        const signature = Buffer.from(changedAuth.sig, 'base64url');
        assert.equal(verify(null, changedInput, key, signature), item.valid, item.id);
    }

    const types = { OPEN: FRAME_TYPE.OPEN, DATA: FRAME_TYPE.DATA, CLOSE: FRAME_TYPE.CLOSE, WINDOW: FRAME_TYPE.WINDOW };
    for (const vector of frames.valid) {
        const expected = vector.frame;
        const frame =
            expected.type === 'OPEN'
                ? { type: types.OPEN, streamId: expected.streamId, family: expected.family, address: fromHex(expected.address), port: expected.port }
                : expected.type === 'DATA'
                  ? { type: types.DATA, streamId: expected.streamId, payload: fromHex(expected.payload) }
                  : expected.type === 'CLOSE'
                    ? { type: types.CLOSE, streamId: expected.streamId, code: expected.code }
                    : { type: types.WINDOW, streamId: expected.streamId, increment: expected.increment };
        assert.deepEqual(decodeFrame(fromHex(vector.hex)), { kind: 'frame', frame }, vector.id);
        assert.equal(hex(encodeFrame(frame)), vector.hex, vector.id);
    }
    for (const vector of frames.ignored) assert.deepEqual(decodeFrame(fromHex(vector.hex)), { kind: 'ignored', typeCode: vector.typeCode }, vector.id);
    for (const vector of frames.invalid) assert.deepEqual(decodeFrame(fromHex(vector.hex)), { kind: 'invalid', reason: vector.reason }, vector.id);
    const oversize = new Uint8Array(5 + frames.oversizeDataPayloadBytes);
    oversize.set([FRAME_TYPE.DATA, 0, 0, 0, 1]);
    assert.deepEqual(decodeFrame(oversize), { kind: 'invalid', reason: 'payload-too-large' });
});

test('engine identity: created once, private, stable, never replaced, refused when unsafe', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk app identity');
    const directory = join(root, '.ptbk', 'app');
    await mkdir(join(root, '.ptbk'));
    assert.equal(await loadEngineIdentity(directory, { create: false }), undefined, 'nothing exists before linking');
    await assert.rejects(stat(directory), { code: 'ENOENT' }, 'reading never creates the directory');
    const created = await Promise.all([1, 2, 3, 4].map(() => loadEngineIdentity(directory, { create: true })));
    assert.equal(new Set(created.map((identity) => identity.engineId)).size, 1, 'concurrent creation converges on one key');
    const [identity] = created;
    assert.match(identity.engineId, /^[a-z2-7]{26}$/);
    assert.equal(identity.engineId, deriveEngineId(identity.signer.publicKey));
    assert.match(identity.fingerprint.formatted, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/);
    assert.deepEqual(await readdir(directory), ['engine-key.pem']);
    assert.equal((await loadEngineIdentity(directory, { create: false })).engineId, identity.engineId, 'the same key on every load');
    if (POSIX) {
        assert.equal((await stat(directory)).mode & 0o777, 0o700);
        assert.equal((await stat(join(directory, 'engine-key.pem'))).mode & 0o777, 0o600);
        await chmod(join(directory, 'engine-key.pem'), 0o644);
        await assert.rejects(loadEngineIdentity(directory, { create: true }), /engine-key\.pem/, 'a loosened key is refused, never regenerated');
        await chmod(join(directory, 'engine-key.pem'), 0o600);
        await chmod(directory, 0o755);
        await assert.rejects(loadEngineIdentity(directory, { create: false }), /app/, 'a loosened directory is refused');
        await chmod(directory, 0o700);
        const other = join(root, 'linked');
        await mkdir(other, { mode: 0o700 });
        await writeFile(join(other, 'outside.pem'), await readFile(join(directory, 'engine-key.pem')), { mode: 0o600 });
        await symlink(join(other, 'outside.pem'), join(other, 'engine-key.pem'));
        await assert.rejects(loadEngineIdentity(other, { create: true }), /engine-key\.pem/, 'a symlinked key is refused');
    }
    await writeFile(join(directory, 'engine-key.pem'), 'damaged', POSIX ? { mode: 0o600 } : undefined);
    await assert.rejects(loadEngineIdentity(directory, { create: true }), 'an unreadable key is reported, never replaced');
    assert.equal(await readFile(join(directory, 'engine-key.pem'), 'utf8'), 'damaged');
});

test('App presentation: state, identity, relays and heartbeat; the body on the App page only; no secrets', () => {
    const style = createStyle(false);
    const body = '{"v":1,"engineId":"abcdefghijklmnopqrstuvwxyz","seq":1,"ts":"2026-11-06T00:00:00.000Z","version":"0.119.0","uptimeS":5,"diskPct":40,"ramPct":60,"cpuLoad":"low","update":"none","agents":2,"members":0}';
    const linked = {
        state: 'linked',
        dashboardUrl: 'https://app.ptbk.io',
        engineId: 'abcdefghijklmnopqrstuvwxyz',
        fingerprint: 'ABCD-EFGH-JKMN-PQRS-TVWX',
        hostname: 'abcdefghijklmnopqrstuvwxyz.engines.example',
        url: 'https://abcdefghijklmnopqrstuvwxyz.engines.example/',
        linkedAt: new Date().toISOString(),
        relays: [
            { relay: 'relay-1.example', state: 'connected', since: new Date().toISOString(), streams: 0 },
            { relay: 'relay-2.example', state: 'waiting', since: new Date().toISOString(), problem: 'The relay is restarting.', retryAt: new Date().toISOString(), streams: 0 },
        ],
        heartbeat: { at: new Date().toISOString(), outcome: 'accepted', status: 204, body, nextAt: new Date().toISOString() },
        browserAccess: 'unavailable',
    };
    const page = appPlainLines(linked).join('\n');
    assert.match(page, /^App Linked/);
    assert.match(page, /Connected to 1 of 2 relays/);
    assert.match(page, /relay-2\.example waiting/);
    assert.match(page, /The relay is restarting\./);
    assert.match(page, /Heartbeat .* accepted/);
    assert.match(page, /Everything the App learns/);
    assert.match(page, /"agents":2/);
    assert.match(page, /waits for the engine's own certificate/);
    assert.match(appPlainLines({ ...linked, relays: [linked.relays[1]] }).join('\n'), /waits for a connected relay/);
    assert.match(appPlainLines({ ...linked, certificate: { state: 'failed', source: 'acme', problem: 'The ACME server refused the order.' } }).join('\n'), /certificate: The ACME server refused the order\./);
    assert.match(appPlainLines({ ...linked, browserAccess: 'available', owner: 'none' }).join('\n'), /nobody can sign in yet: run `ptbk connect --setup-link`/);
    assert.match(appPlainLines({ ...linked, browserAccess: 'available', owner: 'set' }).join('\n'), /works: sign in there with your passkey/);
    const status = appPlainLines(linked, { heartbeatBody: false }).join('\n');
    assert.match(status, /Heartbeat .* accepted/);
    assert.doesNotMatch(status, /Everything the App learns|"agents"/, 'the status region stays compact');
    assert.match(appTileLines(linked, style).map(stripAnsi).join('\n'), /Linked · 1 of 2 relays/);
    assert.equal(appSummaryLine(linked), 'App: linked (1 of 2 relays) · https://abcdefghijklmnopqrstuvwxyz.engines.example/');
    const replaced = { ...linked, state: 'refused', relays: [{ relay: 'relay-1.example', state: 'stopped', since: new Date().toISOString(), refusal: 'replaced', problem: 'Another process with this project’s engine key took over the tunnel.', streams: 0 }] };
    assert.match(appTileLines(replaced, style).map(stripAnsi).join('\n'), /another copy holds the key/);
    const skewed = { ...linked, heartbeat: { at: new Date().toISOString(), outcome: 'refused', status: 400, code: 'stale-timestamp', skewMs: -180_000, body } };
    assert.match(appDetailLines(skewed, style, 80).join('\n'), /clock is 180 s behind the App/);
    const unlinked = { state: 'unlinked', dashboardUrl: 'https://dashboard.localhost:8443', relays: [], browserAccess: 'unavailable' };
    assert.match(appPlainLines(unlinked).join('\n'), /Get a pairing URL at dashboard\.localhost:8443, then run `ptbk connect --link <url>`/);
    for (const line of appDetailLines(linked, style, 40)) assert.ok(stripAnsi(line).length <= 40, `fits 40 columns: ${line}`);
});

test('App settings refuse insecure transport and parse relay overrides', () => {
    assert.equal(appSettings({}).dashboardUrl, 'https://app.ptbk.io');
    assert.throws(() => appSettings({ PTBK_DASHBOARD_URL: 'http://app.example.com' }), /PTBK_DASHBOARD_URL/);
    assert.throws(() => appSettings({ NODE_TLS_REJECT_UNAUTHORIZED: '0' }), /NODE_TLS_REJECT_UNAUTHORIZED/);
    assert.deepEqual(appSettings({ PTBK_RELAYS: 'wss://relay-1.localhost:8443, wss://relay-2.localhost' }).relays, [
        { id: 'relay-1.localhost', port: 8443 },
        { id: 'relay-2.localhost', port: 443 },
    ]);
    assert.throws(() => appSettings({ PTBK_RELAYS: 'https://relay.example.com' }), /PTBK_RELAYS/);
    assert.throws(() => appSettings({ PTBK_ENGINE_DOMAIN: 'not a domain' }), /PTBK_ENGINE_DOMAIN/);
});

/**
 * One server-side WebSocket of the fake relay (unmasked frames out, masked frames in).
 */
function relaySocket(socket, head, onMessage) {
    let buffer = Buffer.from(head ?? []);
    let closed = false;
    const frame = (opcode, payload) => {
        if (closed && opcode !== 0x8) return;
        const length = payload.length;
        const header = length < 126 ? Buffer.from([0x80 | opcode, length]) : Buffer.alloc(length < 65_536 ? 4 : 10);
        if (length >= 126) {
            header[0] = 0x80 | opcode;
            if (length < 65_536) {
                header[1] = 126;
                header.writeUInt16BE(length, 2);
            } else {
                header[1] = 127;
                header.writeBigUInt64BE(BigInt(length), 2);
            }
        }
        socket.write(Buffer.concat([header, payload]));
    };
    const connection = {
        texts: [],
        frames: [],
        closeCode: undefined,
        sendText: (text) => frame(0x1, Buffer.from(text)),
        sendBinary: (bytes) => frame(0x2, Buffer.from(bytes)),
        close: (code) => {
            const payload = Buffer.alloc(2);
            payload.writeUInt16BE(code);
            frame(0x8, payload);
            closed = true;
            setTimeout(() => socket.destroy(), 200).unref();
        },
        get ended() {
            return socket.destroyed;
        },
    };
    socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        for (;;) {
            if (buffer.length < 2) return;
            const opcode = buffer[0] & 0x0f;
            assert.ok(buffer[1] & 0x80, 'client frames are masked');
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
            if (buffer.length < offset + 4 + length) return;
            const mask = buffer.subarray(offset, offset + 4);
            const payload = Buffer.from(buffer.subarray(offset + 4, offset + 4 + length));
            for (let index = 0; index < payload.length; index++) payload[index] ^= mask[index & 3];
            buffer = buffer.subarray(offset + 4 + length);
            if (opcode === 0x9) frame(0xa, payload);
            else if (opcode === 0x8) {
                connection.closeCode = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
                if (!closed) connection.close(connection.closeCode);
            } else if (opcode === 0x1) {
                connection.texts.push(payload.toString('utf8'));
                onMessage(connection, 'text', payload.toString('utf8'));
            } else if (opcode === 0x2) {
                connection.frames.push(decodeFrame(new Uint8Array(payload)));
                onMessage(connection, 'binary', payload);
            }
        }
    });
    socket.on('error', () => undefined);
    return connection;
}

/**
 * A fake Promptbook App on one TLS port: the dashboard API (`dashboard.localhost`) and the relay tunnel endpoint
 * (`relay-N.localhost`). It verifies every signature the engine sends with the registered key.
 */
async function fakeApp(t) {
    const app = {
        engines: new Map(),
        registrations: 0,
        heartbeats: [],
        connections: [],
        /** Overrides for the next relay connections: `{ relayId, ready }`. */
        relay: {},
        heartbeatAnswer: undefined,
        engineDomain: 'engines.localhost',
    };
    const server = createServer({ key: await readFile(new URL('server-key.pem', TLS)), cert: await readFile(new URL('server.pem', TLS)) }, async (request, response) => {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const body = Buffer.concat(chunks);
        const problem = (status, code, extra = {}) => {
            response.writeHead(status, { 'content-type': 'application/problem+json' });
            response.end(JSON.stringify({ type: 'about:blank', status, code, ...extra }));
        };
        if (request.method === 'POST' && request.url === '/v1/engines/register') {
            app.registrations++;
            const input = JSON.parse(body.toString('utf8'));
            const publicKey = new Uint8Array(Buffer.from(input.enginePublicKey, 'base64url'));
            const message = signingInput(SIGNING_CONTEXT.register, '1', input.linkCode, publicKey, input.engineVersion, input.mode);
            if (!verify(null, message, publicKeyOf(publicKey), Buffer.from(input.sig, 'base64url'))) return problem(400, 'bad-signature');
            if (input.linkCode === linkCode('u')) return problem(400, 'invalid-link-code');
            const engineId = input.linkCode === linkCode('m') ? 'aaaaaaaaaaaaaaaaaaaaaaaaaa' : deriveEngineId(publicKey);
            app.engines.set(engineId, publicKey);
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ engineId, hostname: `${engineId}.${app.engineDomain}`, relays: ['relay-1.localhost'], memberKey: null, futureField: true }));
            return;
        }
        const beat = /^\/v1\/engines\/([a-z2-7]{26})\/heartbeat$/.exec(request.url ?? '');
        if (request.method === 'POST' && beat) {
            const publicKey = app.engines.get(beat[1]);
            const signature = /^ed25519=([A-Za-z0-9_-]+)$/.exec(request.headers['ptbk-signature'] ?? '')?.[1];
            const message = signingInput(SIGNING_CONTEXT.heartbeat, createHash('sha256').update(body).digest());
            const valid = !!publicKey && !!signature && verify(null, message, publicKeyOf(publicKey), Buffer.from(signature, 'base64url'));
            app.heartbeats.push({ engineId: beat[1], body: body.toString('utf8'), valid });
            if (!valid) return problem(401, 'bad-signature');
            if (app.heartbeatAnswer) return problem(app.heartbeatAnswer.status, app.heartbeatAnswer.code, app.heartbeatAnswer.extra);
            response.writeHead(204);
            response.end();
            return;
        }
        problem(404, 'not-found');
    });
    server.on('upgrade', (request, socket, head) => {
        const relayId = (request.headers.host ?? '').split(':')[0];
        if (request.url !== '/v1/tunnel' || request.headers['sec-websocket-protocol'] !== 'ptbk-tunnel') {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            return;
        }
        const accept = createHash('sha1').update(`${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
        socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\nSec-WebSocket-Protocol: ptbk-tunnel\r\n\r\n`);
        const overrides = { ...app.relay };
        const challenge = { v: 1, type: 'challenge', nonce: randomBytes(32).toString('base64url'), relayId: overrides.relayId ?? relayId, protocolVersions: [1], features: [] };
        const connection = relaySocket(socket, head, (peer, kind, data) => {
            if (kind !== 'text' || peer.auth) return;
            const auth = JSON.parse(data);
            peer.auth = auth;
            const publicKey = app.engines.get(auth.engineId);
            const input = tunnelAuthInput(parseRelayMessage(JSON.stringify(challenge)), auth.engineId, { version: auth.version, versions: auth.protocolVersions, features: auth.features });
            peer.authValid = !!publicKey && verify(null, input, publicKeyOf(publicKey), Buffer.from(auth.sig, 'base64url'));
            if (!peer.authValid) return peer.close(4001);
            peer.sendText(JSON.stringify(overrides.ready ?? { v: 1, type: 'ready', protocolVersion: 1, features: [], hostnames: [`${auth.engineId}.${app.engineDomain}`] }));
            peer.ready = true;
        });
        connection.relayId = relayId;
        app.connections.push(connection);
        connection.sendText(JSON.stringify(challenge));
    });
    const sockets = new Set();
    server.on('connection', (socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(async () => {
        for (const socket of sockets) socket.destroy();
        await new Promise((resolve) => server.close(resolve));
    });
    app.port = server.address().port;
    app.env = { PTBK_DASHBOARD_URL: `https://dashboard.localhost:${app.port}`, PTBK_RELAYS: `wss://relay-1.localhost:${app.port}` };
    return app;
}

/** Every file below a directory, as text. */
async function filesText(directory) {
    const parts = [];
    for (const entry of await readdir(directory, { withFileTypes: true, recursive: true })) {
        // Atomic writes rename their temporary files while the engine runs.
        if (entry.isFile()) parts.push(await readFile(join(entry.parentPath ?? entry.path, entry.name), 'utf8').catch(() => ''));
    }
    return parts.join('\n');
}

test('registration: signed, verified against the own key, stored privately without the link code; refusals store nothing', async (t) => {
    const app = await fakeApp(t);
    const root = await temporaryDirectory(t, 'ptbk app registration');
    const directory = join(root, 'app');
    const identity = await loadEngineIdentity(directory, { create: true });
    const settings = appSettings(app.env);

    const notACode = await registerEngine({ identity, linkCode: 'not-a-link-code', settings, env: app.env, tls });
    assert.equal(notACode.kind, 'refused');
    assert.equal(app.registrations, 0, 'a malformed code never reaches the App');

    const used = await registerEngine({ identity, linkCode: linkCode('u'), settings, env: app.env, tls });
    assert.deepEqual({ kind: used.kind, code: used.code, final: used.final }, { kind: 'refused', code: 'invalid-link-code', final: true });
    assert.match(used.message, /ptbk connect --link/);

    const mismatch = await registerEngine({ identity, linkCode: linkCode('m'), settings, env: app.env, tls });
    assert.deepEqual({ kind: mismatch.kind, code: mismatch.code }, { kind: 'refused', code: 'engine-id-mismatch' });
    assert.equal(await readRegistration(directory, identity, settings), undefined, 'nothing was stored');

    const outcome = await registerEngine({ identity, linkCode: linkCode('b'), settings, env: app.env, tls });
    assert.equal(outcome.kind, 'registered', outcome.message);
    assert.equal(outcome.registration.engineId, identity.engineId);
    assert.equal(outcome.registration.hostname, `${identity.engineId}.engines.localhost`);
    assert.equal(outcome.registration.engineDomain, 'engines.localhost', 'the engine domain is pinned from the first registration');
    assert.deepEqual(outcome.registration.relays, ['relay-1.localhost']);
    await storeRegistration(directory, outcome.registration);
    assert.deepEqual(await readRegistration(directory, identity, settings), outcome.registration);
    assert.deepEqual(await readRegistration(directory, identity, appSettings({})), outcome.registration, 'the saved origin survives an unset environment');
    assert.doesNotMatch(await filesText(directory), new RegExp(linkCode('b')), 'the link code is never written');
    if (POSIX) assert.equal((await stat(join(directory, 'registration.json'))).mode & 0o777, 0o600);
    await assert.rejects(readRegistration(directory, identity, appSettings({ PTBK_DASHBOARD_URL: 'https://other.localhost' })), 'a link to another App is never reused silently');

    const view = await storedAppView(directory, app.env);
    assert.equal(view.state, 'offline');
    assert.equal(view.url, `https://${identity.engineId}.engines.localhost/`);
    assert.equal(view.fingerprint, identity.fingerprint.formatted);
    assert.equal(appSummaryLine(view), `App: linked, offline · https://${identity.engineId}.engines.localhost/`);

    await forgetRegistration(directory);
    assert.equal(await readRegistration(directory, identity, settings), undefined);
    assert.equal((await loadEngineIdentity(directory, { create: false })).engineId, identity.engineId, 'disconnecting keeps the identity');
    assert.equal((await storedAppView(directory, app.env)).state, 'unlinked');
});

test('heartbeat: signed exact body, refusals and clock skew reported', async (t) => {
    const app = await fakeApp(t);
    const root = await temporaryDirectory(t, 'ptbk app heartbeat');
    const identity = await loadEngineIdentity(join(root, 'app'), { create: true });
    app.engines.set(identity.engineId, identity.signer.publicKey);
    const body = buildHeartbeat({ engineId: identity.engineId, seq: Date.now(), ts: new Date().toISOString(), version: '0.119.0', uptimeS: 12.7, diskPct: 44, ramPct: 55, cpuLoad: 'low', update: 'none', agents: 3, members: 0 });
    const accepted = await sendHeartbeat({ identity, dashboardUrl: app.env.PTBK_DASHBOARD_URL, body, env: app.env, tls });
    assert.equal(accepted.outcome, 'accepted');
    assert.equal(app.heartbeats.at(-1).valid, true);
    assert.equal(app.heartbeats.at(-1).body, accepted.body);
    assert.deepEqual(Object.keys(JSON.parse(accepted.body)), ['v', 'engineId', 'seq', 'ts', 'version', 'uptimeS', 'diskPct', 'ramPct', 'cpuLoad', 'update', 'agents', 'members']);
    assert.equal(JSON.parse(accepted.body).diskPct, 40, 'percentages are coarse');
    app.heartbeatAnswer = { status: 400, code: 'stale-timestamp', extra: { serverTime: new Date(Date.now() - 300_000).toISOString() } };
    const stale = await sendHeartbeat({ identity, dashboardUrl: app.env.PTBK_DASHBOARD_URL, body, env: app.env, tls });
    assert.equal(stale.outcome, 'refused');
    assert.equal(stale.code, 'stale-timestamp');
    assert.ok(Math.abs(stale.skewMs - 300_000) < 10_000, `skew ${stale.skewMs}`);
    const unreachable = await sendHeartbeat({ identity, dashboardUrl: 'https://dashboard.localhost:1', body, env: app.env, tls });
    assert.equal(unreachable.outcome, 'failed');
});

test('App connection: heartbeat and tunnel, refused streams, protocol errors reconnect, a replaced tunnel stops', async (t) => {
    const app = await fakeApp(t);
    const root = await temporaryDirectory(t, 'ptbk app tunnel');
    const directory = join(root, 'app');
    const identity = await loadEngineIdentity(directory, { create: true });
    const outcome = await registerEngine({ identity, linkCode: linkCode('c'), settings: appSettings(app.env), env: app.env, tls });
    assert.equal(outcome.kind, 'registered', outcome.message);
    await storeRegistration(directory, outcome.registration);
    const logs = [];
    const connection = new AppConnection({ directory, env: app.env, onChange: () => undefined, figures: () => ({ agents: 2, members: 0, update: 'none' }), log: (text, level) => logs.push({ text, level }), tls });
    t.after(() => connection.stop());
    await connection.start();
    const linked = await waitFor(() => {
        const view = connection.view();
        return view.state === 'linked' && view.heartbeat?.outcome === 'accepted' ? view : undefined;
    }, { timeoutMs: 20_000, intervalMs: 50, message: 'the App connection to link' });
    assert.equal(linked.relays.length, 1);
    assert.deepEqual(linked.relays[0].hostnames, [`${identity.engineId}.engines.localhost`]);
    assert.equal(linked.browserAccess, 'unavailable');
    assert.equal(JSON.parse(linked.heartbeat.body).agents, 2);
    assert.ok(app.heartbeats.every((beat) => beat.valid));
    const [first] = app.connections;
    assert.equal(first.authValid, true, 'the relay verified the signed auth');

    // A browser stream is refused until the engine terminates browser TLS itself.
    first.sendBinary(encodeFrame({ type: FRAME_TYPE.OPEN, streamId: 1, family: 4, address: Uint8Array.of(203, 0, 113, 7), port: 51234 }));
    await waitFor(() => first.frames.some((frame) => frame.kind === 'frame' && frame.frame.type === FRAME_TYPE.CLOSE && frame.frame.streamId === 1 && frame.frame.code === CLOSE_CODE.REFUSED), { timeoutMs: 5000, intervalMs: 20, message: 'the stream to be refused' });

    // A frame for a stream that was never opened is a protocol error; the link reconnects.
    first.sendBinary(encodeFrame({ type: FRAME_TYPE.DATA, streamId: 9, payload: Uint8Array.of(1) }));
    await waitFor(() => first.closeCode === 4002, { timeoutMs: 5000, intervalMs: 20, message: 'the protocol error close' });
    await waitFor(() => app.connections.length === 2 && connection.view().state === 'linked', { timeoutMs: 20_000, intervalMs: 50, message: 'the link to reconnect' });

    // Another copy of the key took over: the link stops dialling and raises attention.
    app.connections[1].close(4000);
    const replaced = await waitFor(() => {
        const view = connection.view();
        return view.relays[0].refusal === 'replaced' ? view : undefined;
    }, { timeoutMs: 5000, intervalMs: 20, message: 'the replaced tunnel' });
    assert.equal(replaced.state, 'refused');
    assert.equal(replaced.relays[0].state, 'stopped');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.equal(app.connections.length, 2, 'a replaced tunnel is not dialled again');
    assert.ok(logs.some((entry) => entry.level === 'error' && /another copy/i.test(entry.text)));
});

test('tunnel handshake: no answer to another relay’s challenge, and a downgraded ready closes the tunnel', async (t) => {
    const app = await fakeApp(t);
    const root = await temporaryDirectory(t, 'ptbk app handshake');
    const directory = join(root, 'app');
    const identity = await loadEngineIdentity(directory, { create: true });
    const outcome = await registerEngine({ identity, linkCode: linkCode('d'), settings: appSettings(app.env), env: app.env, tls });
    await storeRegistration(directory, outcome.registration);
    app.relay = { relayId: 'relay-2.localhost' };
    const connection = new AppConnection({ directory, env: app.env, onChange: () => undefined, figures: () => ({ agents: 0, members: 0, update: 'none' }), tls });
    t.after(() => connection.stop());
    await connection.start();
    await waitFor(() => app.connections[0]?.closeCode === 4002, { timeoutMs: 10_000, intervalMs: 20, message: 'the wrong-relay close' });
    assert.equal(app.connections[0].texts.length, 0, 'no signature over another relay’s challenge');
    assert.match(connection.view().relays[0].problem ?? '', /another relay/);
    app.relay = { ready: { v: 1, type: 'ready', protocolVersion: 1, features: ['x-extra'], hostnames: [] } };
    await waitFor(() => app.connections.some((peer) => peer.ready && peer.closeCode === 4002), { timeoutMs: 20_000, intervalMs: 50, message: 'the downgrade close' });
    assert.notEqual(connection.view().state, 'linked');
});

test('ptbk connect and disconnect: status, linking a running engine, its tunnel, and unlinking', async (t) => {
    const app = await fakeApp(t);
    const { project, env: harnessEnv } = await initializedProject(t);
    const env = { ...harnessEnv, ...app.env, NODE_EXTRA_CA_CERTS: fileURLToPath(CA_PATH) };
    const unlinked = await ptbk(['connect', '--raw'], { cwd: project, env });
    assert.equal(unlinked.code, 0, unlinked.output);
    assert.match(unlinked.stdout, /App: Not linked/);
    assert.match(unlinked.stdout, /ptbk connect --link <url>/);
    await assert.rejects(stat(join(project, '.ptbk', 'app', 'engine-key.pem')), { code: 'ENOENT' }, 'showing the status creates no identity');

    const started = await ptbk(['start', '--raw', '--no-persist'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    assert.doesNotMatch(started.stdout, /127\.0\.0\.1|Local dashboard/, 'the local address is not presented');
    const running = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.equal(running.app.state, 'unlinked');

    const code = linkCode('e');
    const linked = await ptbk(['connect', '--link', `${app.env.PTBK_DASHBOARD_URL}/link#${code}`, '--raw'], { cwd: project, env });
    assert.equal(linked.code, 0, linked.output);
    assert.match(linked.stdout, /Linked to the Promptbook App/);
    assert.doesNotMatch(linked.output, new RegExp(code), 'the link code is never printed');
    assert.doesNotMatch(await filesText(join(project, '.ptbk')), new RegExp(code), 'the link code is never written');
    assert.match((await ptbk(['status', '--raw'], { cwd: project, env })).stdout, /APP CONNECTION/);
    await waitFor(() => app.connections.some((peer) => peer.ready && peer.authValid), { timeoutMs: 30_000, intervalMs: 100, message: 'the running engine to open its tunnel' });
    const live = await waitFor(async () => {
        const view = JSON.parse((await ptbk(['connect', '--json'], { cwd: project, env })).stdout);
        return view.state === 'linked' && view.heartbeat?.outcome === 'accepted' ? view : undefined;
    }, { timeoutMs: 30_000, intervalMs: 250, message: 'the engine to report its App connection' });
    assert.equal(live.hostname, `${live.engineId}.engines.localhost`);
    const again = await ptbk(['connect', '--link', linkCode('f'), '--json'], { cwd: project, env });
    assert.equal(JSON.parse(again.stdout).outcome, 'already-linked');
    assert.equal(app.registrations, 1, 'an already linked project makes no network call');
    const dashboard = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.equal(dashboard.attention.app, undefined, 'a healthy link needs no attention');

    const disconnected = await ptbk(['disconnect', '--raw'], { cwd: project, env });
    assert.equal(disconnected.code, 0, disconnected.output);
    assert.match(disconnected.stdout, /Disconnected/);
    await waitFor(() => app.connections.every((peer) => peer.ended), { timeoutMs: 10_000, intervalMs: 100, message: 'the tunnel to close' });
    assert.equal(JSON.parse((await ptbk(['connect', '--json'], { cwd: project, env })).stdout).state, 'unlinked');
    assert.equal((await stat(join(project, '.ptbk', 'app', 'engine-key.pem'))).isFile(), true, 'the identity stays');
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('an unnamed initialization pairs through the relay before asking for any project files', async (t) => {
    const app = await fakeApp(t);
    const cleanup = [];
    const root = await temporaryDirectory(t, 'ptbk pair before init', cleanup);
    const { env: harnessEnv } = await fakeHarness(t, root);
    const { PTBK_DASHBOARD_URL: origin, ...appEnv } = app.env;
    const env = { ...harnessEnv, ...appEnv, PTBK_ACME_DIRECTORY_URL: `${origin}/test-acme`, NODE_EXTRA_CA_CERTS: fileURLToPath(CA_PATH) };
    const projectsHome = join(root, 'projects');
    const id = 'relay-onboarding';
    const workspace = join(env.PTBK_HOME, 'initializations', id);
    await mkdir(workspace, { recursive: true, mode: 0o700 });
    await mkdir(projectsHome);
    await writeFile(join(workspace, 'pending-project.json'), JSON.stringify({ id, projectsHome }), { mode: 0o600 });
    cleanup.push(() => ptbk(['stop', '--force', '--path', workspace, '--raw'], { cwd: root, env }));
    const code = linkCode('g');
    const result = await ptbk(['init', '--prepare-only', '--initialization', id, '--link-stdin', '--no-persist', '--json'], { cwd: root, env, input: `${origin}/link#${code}\n` });
    assert.equal(result.code, 0, result.output);
    assert.equal(JSON.parse(result.stdout).app.dashboardUrl, origin);
    assert.doesNotMatch(result.output, new RegExp(code));
    await waitFor(() => app.connections.some((peer) => peer.ready && peer.authValid), { message: 'the unnamed engine to open its relay tunnel' });
    assert.deepEqual(await readdir(projectsHome), []);
    const state = await ptbk(['onboarding', id, '--json'], { cwd: root, env });
    assert.equal(JSON.parse(state.stdout).prompt.kind, 'text');
    assert.doesNotMatch(await filesText(workspace), new RegExp(code));
});
