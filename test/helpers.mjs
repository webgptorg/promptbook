import { execFile, spawn } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
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
 * Runs Git in a directory with fixture identity and without signing or hooks from the runner.
 */
export async function git(cwd, args) {
    const { stdout } = await execFileAsync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd, env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture Tester', GIT_AUTHOR_EMAIL: 'fixture@example.test', GIT_COMMITTER_NAME: 'Fixture Tester', GIT_COMMITTER_EMAIL: 'fixture@example.test' } });
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
            // The fixture browser executable is not a browser: engines connect browsers at their first use only.
            PTBK_BROWSER_START: 'lazy',
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
    args.push(...(options.start ? ['--no-tunnel', '--no-persist'] : ['--no-start']), ...(options.initArgs ?? []));
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
    return (await git(project, ['log', '--format=%B%x00'])).split('\0').map((message) => message.trim()).filter(Boolean);
}

/**
 * Commit subjects, newest first.
 */
export async function subjects(project) {
    return (await git(project, ['log', '--format=%s'])).trim().split('\n').filter(Boolean);
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
 * The first item matching a generated name (e.g. a commit subject `PTBK: <title> — <date time>`).
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
export async function committed(project, title, prefix = 'PTBK: ') {
    return findGenerated(await subjects(project), title, prefix);
}
