import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readServiceRecord, runService, serviceCommand, stopService } from '../dist/coder/service.js';

/** Produce real supervisor credentials without duplicating the platform's endpoint naming rules. */
async function fixture(t) {
    const projectPath = await realpath(await mkdtemp(path.join(tmpdir(), 'ptbk-control-')));
    const cleanups = [];
    t.after(async () => { try { for (const cleanup of cleanups.reverse()) await cleanup(); } finally { await rm(projectPath, { recursive: true, force: true }); } });
    const workspace = { projectPath, gitRoot: projectPath, statePath: path.join(projectPath, '.ptbk'), tasksPath: path.join(projectPath, 'tasks'), legacyPath: path.join(projectPath, 'prompts'), timezone: 'UTC' };
    await mkdir(workspace.tasksPath);
    const controller = new AbortController();
    let announced;
    await runService(workspace, { mode: 'daemon', noPersist: true, noServer: true, noQr: true, automatic: false, signal: controller.signal, onReady: record => { announced = record; controller.abort(); } });
    assert.ok(announced, 'The real supervisor published a ready identity');
    const record = { ...await readServiceRecord(workspace), status: 'ready', desired: 'running' };
    const filename = path.join(workspace.statePath, 'process.json');
    await writeFile(filename, JSON.stringify(record));
    return { workspace, record, filename, cleanups };
}

/** Represent the transport fault delivered by an operating system socket. */
function transportError(code) {
    return Object.assign(new Error(`Fixture transport ${code}`), { code });
}

/** Deliver socket events deterministically while exercising the production authentication and framing code. */
class ScriptedSocket extends EventEmitter {
    constructor(receive, beforeConnect = async () => undefined) {
        super();
        this.receive = receive;
        void Promise.resolve().then(beforeConnect).then(failure => this.emit(failure ? 'error' : 'connect', failure)).catch(error => this.emit('error', error));
    }
    /** Preserve the Socket interface used by the command client. */
    setEncoding() { return this; }
    /** Immediate scripted responses require no wall-clock timeout. */
    setTimeout() { return this; }
    /** Dispatch the actual serialized command after client listeners have been installed. */
    write(value) {
        void Promise.resolve().then(() => this.receive(this, JSON.parse(value.trimEnd()))).catch(error => this.emit('error', error));
        return true;
    }
    /** A successful client closes after trusting one complete response. */
    end() { queueMicrotask(() => this.emit('close')); return this; }
    /** Parsing failures close the connection without synthesizing another reply. */
    destroy(error) {
        queueMicrotask(() => { if (error) this.emit('error', error); this.emit('close'); });
        return this;
    }
}

/** Capture wire commands and endpoints while allowing each scripted exchange to control its outcome. */
function transport(receive, sleep = async () => {}, beforeConnect = async () => undefined) {
    const commands = [];
    const endpoints = [];
    return { commands, endpoints, options: {
        connect(endpoint) {
            const index = endpoints.length;
            endpoints.push(endpoint);
            return new ScriptedSocket((socket, command) => {
                commands.push(command);
                return receive(socket, command, index);
            }, () => beforeConnect(index));
        },
        sleep,
    } };
}

/** Send a complete authenticated reply through the production parser. */
function reply(socket, record, result = { id: record.id, pid: record.pid, status: 'ready' }) {
    socket.emit('data', `${JSON.stringify({ id: record.id, pid: record.pid, result })}\n`);
}

test('inspection retries a reset with freshly read process credentials', async t => {
    const { workspace, record, filename } = await fixture(t);
    const replacement = { ...record, id: randomUUID(), token: randomUUID() };
    const waits = [];
    const connection = transport((socket, command, index) => {
        if (index === 0) socket.emit('error', transportError('ECONNRESET'));
        else reply(socket, replacement);
    }, async milliseconds => { waits.push(milliseconds); await writeFile(filename, JSON.stringify(replacement)); });
    assert.equal((await serviceCommand(workspace, 'inspect', {}, undefined, connection.options)).id, replacement.id);
    assert.deepEqual(connection.commands.map(command => [command.identity, command.token]), [[record.id, record.token], [replacement.id, replacement.token]]);
    assert.deepEqual(connection.endpoints, [record.endpoint, replacement.endpoint]);
    assert.deepEqual(waits, [50]);
});

test('inspection recognizes an endpoint that disappears after a reset', async t => {
    const { workspace } = await fixture(t);
    const connection = transport(socket => socket.emit('error', transportError('ECONNRESET')), undefined, async index => index > 0 ? transportError('ENOENT') : undefined);
    assert.equal(await serviceCommand(workspace, 'inspect', {}, undefined, connection.options), undefined);
    assert.equal(connection.commands.length, 1);
    assert.equal(connection.endpoints.length, 2);
});

test('an unavailable endpoint is distinguished from a mutation that already reached the transport', async t => {
    for (const code of ['ENOENT', 'ECONNREFUSED']) await t.test(code, async t => {
        const { workspace } = await fixture(t);
        const absent = transport(() => assert.fail('An unreachable endpoint cannot receive a command'), undefined, async () => transportError(code));
        assert.equal(await serviceCommand(workspace, 'inspect', {}, undefined, absent.options), undefined);
        assert.equal(await serviceCommand(workspace, 'resume', {}, undefined, absent.options), undefined);
        assert.equal(absent.commands.length, 0);
        assert.equal(absent.endpoints.length, 2);
        const waits = [];
        const written = transport(socket => socket.emit('error', transportError(code)), async milliseconds => { waits.push(milliseconds); });
        await assert.rejects(serviceCommand(workspace, 'resume', {}, undefined, written.options), error => /uncertain/i.test(error.message) && error.cause?.code === code);
        assert.deepEqual(written.commands.map(command => command.action), ['resume']);
        assert.deepEqual(waits, []);
    });
});

test('persistent inspection resets remain bounded and report the unavailable reply', async t => {
    const { workspace } = await fixture(t);
    const waits = [];
    const connection = transport(socket => socket.emit('error', transportError('ECONNRESET')), async milliseconds => { waits.push(milliseconds); });
    await assert.rejects(serviceCommand(workspace, 'inspect', {}, undefined, connection.options), error => error.code === 'ECONNRESET');
    assert.equal(connection.commands.length, 3);
    assert.deepEqual(waits, [50, 100]);
});

test('an identity-bound inspection rejects replacement credentials before reconnecting', async t => {
    const { workspace, record, filename } = await fixture(t);
    const replacement = { ...record, id: randomUUID(), token: randomUUID() };
    const connection = transport(socket => socket.emit('error', transportError('ECONNRESET')), async () => writeFile(filename, JSON.stringify(replacement)));
    await assert.rejects(serviceCommand(workspace, 'inspect', {}, { id: record.id, pid: record.pid }, connection.options), /identity changed/i);
    assert.equal(connection.commands.length, 1, 'A replacement process never receives the old client\'s request');
    assert.equal((await readServiceRecord(workspace)).id, replacement.id);
});

test('a mutation with a lost reply is reported once and never replayed', async t => {
    const { workspace } = await fixture(t);
    const waits = [];
    const connection = transport(socket => socket.emit('error', transportError('ECONNRESET')), async milliseconds => { waits.push(milliseconds); });
    await assert.rejects(serviceCommand(workspace, 'resume', {}, undefined, connection.options), error => error.code === 'ECONNRESET' && /uncertain/i.test(error.message));
    assert.deepEqual(connection.commands.map(command => command.action), ['resume']);
    assert.deepEqual(waits, []);
});

test('a broken pipe permits inspection retry but leaves a mutation uncertain', async t => {
    const { workspace, record } = await fixture(t);
    const inspected = transport((socket, command, index) => {
        if (index === 0) socket.emit('error', transportError('EPIPE'));
        else reply(socket, record);
    });
    assert.equal((await serviceCommand(workspace, 'inspect', {}, undefined, inspected.options)).id, record.id);
    assert.equal(inspected.commands.length, 2);
    const mutated = transport(socket => socket.emit('error', transportError('EPIPE')));
    await assert.rejects(serviceCommand(workspace, 'pause', {}, undefined, mutated.options), error => error.code === 'EPIPE' && /uncertain/i.test(error.message));
    assert.deepEqual(mutated.commands.map(command => command.action), ['pause']);
});

test('a complete authenticated response remains accepted if the socket subsequently resets', async t => {
    const { workspace, record } = await fixture(t);
    const waits = [];
    const connection = transport(socket => {
        reply(socket, record);
        socket.emit('error', transportError('ECONNRESET'));
        socket.emit('end');
        socket.emit('close');
    }, async milliseconds => { waits.push(milliseconds); });
    assert.equal((await serviceCommand(workspace, 'inspect', {}, undefined, connection.options)).id, record.id);
    assert.equal(connection.commands.length, 1);
    assert.deepEqual(waits, []);
});

test('incomplete inspection replies retry an orderly EOF and an abrupt close', async t => {
    for (const ending of ['end', 'close']) await t.test(ending, async t => {
        const { workspace, record } = await fixture(t);
        const connection = transport((socket, command, index) => {
            if (index === 0) { socket.emit('data', '{"id":'); socket.emit(ending); }
            else reply(socket, record);
        });
        assert.equal((await serviceCommand(workspace, 'inspect', {}, undefined, connection.options)).id, record.id);
        assert.equal(connection.commands.length, 2);
    });
});

test('a complete malformed response is rejected without transport retries', async t => {
    const { workspace } = await fixture(t);
    const waits = [];
    const connection = transport(socket => socket.emit('data', '{malformed}\n'), async milliseconds => { waits.push(milliseconds); });
    await assert.rejects(serviceCommand(workspace, 'inspect', {}, undefined, connection.options), SyntaxError);
    assert.equal(connection.commands.length, 1);
    assert.deepEqual(waits, []);
});

test('stop waits for ownership release after a reset and remains safe to repeat', async t => {
    const { workspace, record } = await fixture(t);
    const ownerFile = path.join(workspace.statePath, 'service-owner.lock');
    const owner = JSON.stringify({ id: record.ownerId, pid: record.pid });
    await writeFile(ownerFile, owner);
    const waits = [];
    let released = false;
    const connection = transport((socket, command, index) => {
        if (index < 2) reply(socket, record, command.action === 'stop' ? { stopping: true } : undefined);
        else socket.emit('error', transportError('ECONNRESET'));
    }, async milliseconds => { waits.push(milliseconds); }, async index => {
        if (index < 3) return undefined;
        if (index === 3 || index === 4) {
            assert.equal(await readFile(ownerFile, 'utf8'), owner, 'A disappeared endpoint does not by itself prove graceful shutdown');
            assert.equal((await readServiceRecord(workspace)).desired, 'stopped');
        }
        if (index === 4) { await rm(ownerFile); released = true; }
        return transportError('ENOENT');
    });
    await stopService(workspace, true, connection.options);
    assert.equal(released, true);
    assert.deepEqual(waits, [50]);
    assert.deepEqual(connection.commands.map(command => command.action), ['inspect', 'stop', 'inspect']);
    assert.equal(connection.endpoints.length, 5);
    await stopService(workspace, true, connection.options);
    assert.equal(connection.commands.filter(command => command.action === 'stop').length, 1, 'Repeated stop does not replay a previously accepted mutation');
    assert.equal((await readServiceRecord(workspace)).desired, 'stopped');
});

test('stop preserves a replacement process that appears after the initial inspection', async t => {
    const { workspace, record, filename } = await fixture(t);
    const replacement = { ...record, id: randomUUID(), token: randomUUID(), ownerId: randomUUID() };
    const ownerFile = path.join(workspace.statePath, 'service-owner.lock');
    const owner = JSON.stringify({ id: replacement.ownerId, pid: replacement.pid });
    await writeFile(ownerFile, owner);
    const connection = transport(async socket => {
        await writeFile(filename, JSON.stringify(replacement));
        reply(socket, record);
    });
    await assert.rejects(stopService(workspace, true, connection.options), /identity changed/i);
    assert.deepEqual(connection.commands.map(command => command.action), ['inspect']);
    assert.equal(await readFile(ownerFile, 'utf8'), owner);
    assert.equal((await readServiceRecord(workspace)).id, replacement.id);
    assert.equal((await readServiceRecord(workspace)).desired, 'running', 'Stopping the old identity must not change the replacement\'s desired lifetime');
});

test('stop preserves replacement ownership published before the old process replies', async t => {
    const { workspace, record, filename } = await fixture(t);
    const replacement = { ...record, id: randomUUID(), token: randomUUID(), ownerId: randomUUID() };
    const ownerFile = path.join(workspace.statePath, 'service-owner.lock');
    const owner = JSON.stringify({ id: replacement.ownerId, pid: replacement.pid });
    const connection = transport(async (socket, command) => {
        if (command.action === 'stop') {
            await writeFile(filename, JSON.stringify(replacement));
            await writeFile(ownerFile, owner);
        }
        reply(socket, record, command.action === 'stop' ? { stopping: true } : undefined);
    });
    await assert.rejects(stopService(workspace, true, connection.options), /identity changed/i);
    assert.deepEqual(connection.commands.map(command => command.action), ['inspect', 'stop']);
    assert.equal(await readFile(ownerFile, 'utf8'), owner);
    assert.equal((await readServiceRecord(workspace)).id, replacement.id);
    assert.equal((await readServiceRecord(workspace)).desired, 'running');
});

test('disconnecting during a real control reply leaves the supervisor inspectable', { timeout: 30_000 }, async t => {
    const { workspace, cleanups } = await fixture(t);
    const source = `TASK Large future response\nTASK ID disconnect\nTASK AFTER 2099-01-01T00:00Z\n${'x'.repeat(240 * 1024)}\n`;
    await writeFile(path.join(workspace.tasksPath, 'future.book'), source);
    const controller = new AbortController();
    let announce;
    const ready = new Promise(resolve => { announce = resolve; });
    const completion = runService(workspace, { mode: 'daemon', noPersist: true, noServer: true, noQr: true, automatic: false, signal: controller.signal, onReady: announce });
    cleanups.push(async () => { controller.abort(); await completion; });
    const record = await Promise.race([ready, completion.then(() => { throw new Error('Supervisor stopped before readiness'); })]);
    const received = await new Promise((resolve, reject) => {
        let firstChunk;
        const client = connect(record.endpoint);
        client.setTimeout(5000, () => client.destroy(new Error('Fixture did not receive a control response')));
        client.once('connect', () => client.write(`${JSON.stringify({ token: record.token, identity: record.id, action: 'read-task', input: { id: 'disconnect' } })}\n`));
        client.once('data', chunk => { firstChunk = chunk; client.destroy(); });
        client.once('error', reject);
        client.once('close', () => resolve(firstChunk));
    });
    assert.ok(received?.length > 0 && received.length < Buffer.byteLength(source), 'The authenticated client disconnected before its large response finished');
    assert.match(received.toString('utf8'), /"result":/, 'The partial frame contains a successful result rather than a short error reply');
    assert.equal(received.includes(10), false, 'The successful response has not yet reached its newline frame boundary');
    assert.equal((await serviceCommand(workspace)).id, record.id, 'A disconnected client does not terminate the supervisor');
    controller.abort();
    await completion;
});
