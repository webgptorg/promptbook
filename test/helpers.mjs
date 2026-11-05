import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmod, copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

/**
 * Root of the checkout under test.
 */
export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * The CLI entry of the checkout.
 */
export const BIN = join(ROOT, 'bin', 'ptbk.js');

const execFileAsync = promisify(execFile);

/**
 * Fixture Git identity (fixtures never rely on a global Git author or signing identity).
 */
export const GIT_IDENTITY = { CODING_AGENT_GIT_NAME: 'Fixture Tester', CODING_AGENT_GIT_EMAIL: 'fixture@example.test' };

/**
 * Creates a temporary directory whose name contains spaces (canonical path).
 */
export async function temporaryDirectory(t, label = 'ptbk fixture', beforeRemoval = []) {
    const directory = await realpath(await mkdtemp(join(tmpdir(), `${label.replace(/\s+/g, ' ')} `)));
    t.after(async () => {
        for (const action of beforeRemoval) await action().catch(() => undefined);
        await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    });
    return directory;
}

/**
 * Runs Git with fixture identity and no optional index refresh, signing or hooks from the runner. Observers must
 * not race the engine's serialized commits by refreshing the index while polling for completion.
 */
export async function git(cwd, args) {
    const { stdout } = await execFileAsync('git', ['--no-optional-locks', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd, env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture Tester', GIT_AUTHOR_EMAIL: 'fixture@example.test', GIT_COMMITTER_NAME: 'Fixture Tester', GIT_COMMITTER_EMAIL: 'fixture@example.test' } });
    return stdout;
}

/**
 * Initializes a Git repository with local identity configuration.
 */
export async function initRepository(directory) {
    await mkdir(directory, { recursive: true });
    await git(directory, ['init', '--quiet']);
    await git(directory, ['config', 'user.name', 'Fixture Tester']);
    await git(directory, ['config', 'user.email', 'fixture@example.test']);
    await git(directory, ['config', 'commit.gpgsign', 'false']);
    await git(directory, ['config', 'core.autocrlf', 'false']);
}

/**
 * Installs the deterministic fake Codex harness and returns an environment that finds it first.
 */
export async function fakeHarness(t, directory) {
    const bin = join(directory, 'fake bin');
    await mkdir(bin, { recursive: true });
    const script = join(bin, 'codex.mjs');
    await copyFile(join(ROOT, 'test', 'fixtures', 'fake-codex.mjs'), script);
    if (process.platform === 'win32') {
        await writeFile(join(bin, 'codex.cmd'), `@echo off\r\n"${process.execPath}" "%~dp0codex.mjs" %*\r\n`);
        await writeFile(join(bin, 'ptbk.cmd'), `@echo off\r\n"${process.execPath}" "${BIN}" %*\r\n`);
    } else {
        await writeFile(join(bin, 'codex'), `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`);
        await writeFile(join(bin, 'ptbk'), `#!/bin/sh\nexec "${process.execPath}" "${BIN}" "$@"\n`);
        await chmod(join(bin, 'codex'), 0o755);
        await chmod(join(bin, 'ptbk'), 0o755);
    }
    const log = join(directory, 'fake-codex.log');
    const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
    return {
        log,
        env: {
            ...process.env,
            ...GIT_IDENTITY,
            [pathKey]: `${bin}${delimiter}${process.env[pathKey] ?? ''}`,
            FAKE_CODEX_LOG: log,
            NO_COLOR: '1',
            PTBK_HOME: join(directory, 'ptbk home'),
            OPENAI_API_KEY: '',
            // Browser readiness only checks that an executable exists (it is never launched by these fixtures).
            CHROME_PATH: process.execPath,
            // Fixtures never depend on Internet reachability (Health still measures disk, memory and CPU).
            PTBK_HEALTH_CONNECTIVITY: 'off',
            // Fixtures never download the public price catalog.
            PTBK_PRICE_LISTS: 'off',
            // Fixtures never reach the public common-knowledge site.
            PTBK_KNOWLEDGE_SOURCES: 'off',
            // The fixture browser executable is not a browser: engines connect browsers at their first use only.
            PTBK_BROWSER_START: 'lazy',
            // Fixtures never touch the real Keychain/DPAPI/systemd credentials (an explicit unprotected test store).
            PTBK_HOST_UNLOCK: 'insecure-test-file',
        },
    };
}

/**
 * Runs the CLI and returns its exit code and output (never throws on a nonzero exit).
 */
export function ptbk(args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [BIN, ...args], { cwd: options.cwd, env: options.env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
        child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
        child.on('error', reject);
        const timer = setTimeout(() => child.kill(), options.timeoutMs ?? 120_000);
        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({ code, stdout, stderr, output: `${stdout}\n${stderr}` });
        });
        child.stdin.end(options.input ?? '');
    });
}

/**
 * Polls until a condition holds (bounded).
 */
export async function waitFor(condition, { timeoutMs = 60_000, intervalMs = 250, message = 'condition' } = {}) {
    const deadline = Date.now() + timeoutMs;
    let last;
    while (Date.now() < deadline) {
        last = await condition();
        if (last) return last;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Timed out waiting for ${message}.`);
}

/**
 * Creates an initialized ptbk project with the fake harness (global installation, real check).
 *
 * By default init does not start the agenda (`--no-start`) so tests control execution; `options.start` keeps the
 * automatic background start (local-only, without persistence) and `options.initArgs` adds init flags.
 */
export async function initializedProject(t, options = {}) {
    const beforeRemoval = [];
    const directory = await temporaryDirectory(t, 'ptbk fixture', beforeRemoval);
    const harness = await fakeHarness(t, directory);
    const project = join(directory, 'my project');
    // Owned background services are stopped before their fixture directory is removed.
    beforeRemoval.push(() => ptbk(['stop', '--force', '--raw', '--path', project], { cwd: directory, env: harness.env }));
    await initRepository(project);
    if (options.check) {
        await writeFile(join(project, 'check.mjs'), options.check);
        await git(project, ['add', 'check.mjs']);
        await git(project, ['commit', '--quiet', '-m', 'Fixture check']);
    }
    const args = ['init', '--path', project, '--non-interactive', '--installation', 'global', '--harness', 'openai-codex', '--raw'];
    if (options.check) args.push('--check', 'node check.mjs');
    args.push(...(options.start ? ['--no-persist'] : ['--no-start']), ...(options.initArgs ?? []));
    const result = await ptbk(args, { cwd: directory, env: harness.env });
    if (![0, 3].includes(result.code)) throw new Error(`init failed (${result.code}):\n${result.output}`);
    // Fixtures drive the ongoing engine until their work is done; goal discovery would add unrelated enquiries.
    // A published project's history is never rewritten (autosync fixtures keep discovery as configured).
    if (options.discovery !== true && !options.start && !(await git(project, ['remote'])).trim()) {
        const path = join(project, 'ptbk.json');
        const config = JSON.parse(await readFile(path, 'utf8'));
        config.discovery = { ...config.discovery, isEnabled: false };
        await writeFile(path, `${JSON.stringify(config, null, 4)}\n`);
        await git(project, ['commit', '-q', '--amend', '--no-edit', '--', 'ptbk.json']);
    }
    return { directory, project, env: harness.env, log: harness.log, init: result };
}

/**
 * Full commit messages, newest first.
 */
export async function messages(project) {
    return (await rawMessages(project)).map(withoutVisual);
}

/**
 * Full commit messages exactly as committed (agent visuals kept), newest first.
 */
export async function rawMessages(project) {
    return (await git(project, ['log', '--format=%B%x00'])).split('\0').map((message) => message.trim()).filter(Boolean);
}

/**
 * Commit subjects, newest first, without the agent visual of agent-work subjects (see {@link withoutVisual}).
 */
export async function subjects(project) {
    return (await rawSubjects(project)).map(withoutVisual);
}

/**
 * Commit subjects exactly as committed (agent visuals kept), newest first.
 */
export async function rawSubjects(project) {
    return (await git(project, ['log', '--format=%s'])).trim().split('\n').filter(Boolean);
}

/**
 * Pattern of the backtick-quoted agent visual that follows `ptbk: ` in subjects of actual agent work.
 */
export const AGENT_VISUAL = /^(ptbk: )`[^`\n]+` /;

/**
 * A subject (or full message) without the agent visual: ``ptbk: `~<@@/>-` Review export`` → `ptbk: Review export`.
 * Fixtures compare work by its meaningful subject; dedicated assertions inspect the visual with {@link rawSubjects}.
 */
export function withoutVisual(text) {
    return text.replace(AGENT_VISUAL, '$1');
}

/**
 * Creation date/time text that generated task/chat names carry (with an optional discriminator).
 */
const GENERATED_SUFFIX = String.raw` — \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?: \(\d+\))?`;

/**
 * A regular expression matching a generated name (`<title> — <date time>`), optionally with a prefix/suffix.
 */
export function generated(title, prefix = '', suffix = '') {
    const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escape(prefix)}${escape(title)}${GENERATED_SUFFIX}${escape(suffix)}$`, 'm');
}

/**
 * The first item matching a generated name (e.g. a commit subject `ptbk: <title> — <date time>`).
 */
export function findGenerated(items, title, prefix = '') {
    return items.find((item) => generated(title, prefix).test(item));
}

/**
 * Runs the ongoing engine in the foreground with plain events until `until({ output })` holds, then stops it
 * gracefully and returns its whole event stream (fixtures drive bounded work this way; there is no finite run).
 */
export async function drive(project, env, until, { args = [], timeoutMs = 90_000, message = 'the expected work' } = {}) {
    const child = spawn(process.execPath, [BIN, 'start', '--foreground', '--raw', '--no-server', '--no-persist', ...args], { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
    const exited = new Promise((resolve) => child.on('close', (code) => resolve(code)));
    let failure;
    try {
        await waitFor(async () => (await until({ output: `${stdout}\n${stderr}` })) || undefined, { timeoutMs, message });
    } catch (error) {
        failure = error;
    }
    await ptbk(['stop', '--raw', '--timeout', '2m'], { cwd: project, env });
    let timer;
    const code = await Promise.race([exited, new Promise((resolve) => (timer = setTimeout(() => (child.kill(), resolve(null)), 120_000)))]);
    clearTimeout(timer);
    if (failure) throw new Error(`${failure.message}\n--- engine output ---\n${stdout}\n${stderr}`);
    return { code, stdout, stderr, output: `${stdout}\n${stderr}` };
}

/**
 * Whether a commit with a generated-name subject exists (newest first search).
 */
export async function committed(project, title, prefix = 'ptbk: ') {
    return findGenerated(await subjects(project), title, prefix);
}

/**
 * A minimal WebSocket client standing in for a surface page (masked client frames, as a browser sends them). It
 * connects to the surface's socket and authenticates with the invitation of the URL fragment (or a session grant);
 * `pong: false` simulates a page whose computer is gone (pings stay unanswered).
 */
export async function surfaceClient(url, { origin, host, path = '/surface', token, session, pong = true, hello = true } = {}) {
    const page = new URL(url);
    const socket = connect(Number(page.port), '127.0.0.1');
    await new Promise((resolve, reject) => socket.once('connect', resolve).once('error', reject));
    socket.write(`GET ${path} HTTP/1.1\r\nHost: ${host ?? page.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\nOrigin: ${origin ?? page.origin}\r\n\r\n`);
    const client = { status: 0, messages: [], binary: [], closed: undefined, session: undefined };
    let buffer = Buffer.alloc(0);
    let headers = true;
    let finish;
    client.closed = new Promise((resolve) => (finish = resolve));
    socket.on('close', () => finish());
    socket.on('error', () => finish());
    const frame = (opcode, payload) => {
        if (socket.destroyed) return;
        const mask = randomBytes(4);
        const masked = Buffer.from(payload);
        for (let index = 0; index < masked.length; index++) masked[index] ^= mask[index % 4];
        const header = masked.length < 126 ? Buffer.from([0x80 | opcode, 0x80 | masked.length]) : Buffer.concat([Buffer.from([0x80 | opcode, 0x80 | 126]), Buffer.from([masked.length >> 8, masked.length & 0xff])]);
        socket.write(Buffer.concat([header, mask, masked]));
    };
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
                if (opcode === 0x1) {
                    const message = JSON.parse(payload.toString('utf8'));
                    if (message.type === 'welcome') client.session = message.session;
                    client.messages.push(message);
                } else if (opcode === 0x2) client.binary.push(Buffer.from(payload));
                else if (opcode === 0x9 && pong) frame(0xa, payload);
            }
        });
    });
    client.sendText = (value) => frame(0x1, Buffer.from(JSON.stringify(value)));
    client.sendBinary = (data) => frame(0x2, data);
    client.close = () => {
        frame(0x8, Buffer.from([0x03, 0xe8]));
        socket.end();
    };
    await statusKnown;
    if (client.status === 101 && hello) {
        const invitation = token ?? new URLSearchParams(page.hash.slice(1)).get('t');
        client.sendText(session ? { type: 'hello', session } : { type: 'hello', token: invitation });
        await waitFor(() => client.messages.some((message) => message.type === 'welcome' || message.type === 'refused'), { timeoutMs: 5_000, message: 'handshake' });
        client.welcomed = client.messages.some((message) => message.type === 'welcome');
    }
    return client;
}
