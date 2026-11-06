#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, chmod, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The engine command for the App conformance harness (`ptbk-conformance --engine-cmd`): it starts the conformance
 * build of ptbk under the launch contract (PTBK_DATA_DIR, PTBK_MODE=tunnel, PTBK_LINK_CODE, ...) on a throwaway
 * project tied to the data directory, so restarts with the same data directory run the same project.
 *
 *     node scripts/conformance/engine.mjs                         # the engine (--engine-cmd)
 *     node scripts/conformance/engine.mjs conformance-session ... # a session (--engine-session-cmd)
 *
 * The project uses the deterministic fake Codex harness of the test fixtures: the conformance suites exercise the App
 * connection, not agent work.
 */
const root = fileURLToPath(new URL('../..', import.meta.url));
const bin = join(root, 'dist-conformance', 'ptbk.js');
const dataDir = process.env.PTBK_DATA_DIR;
if (!dataDir) {
    process.stderr.write('PTBK_DATA_DIR is required (the launch contract).\n');
    process.exit(2);
}
const base = join(tmpdir(), 'ptbk-conformance', createHash('sha256').update(resolve(dataDir)).digest('hex').slice(0, 16));
const project = join(base, 'project');
const fakeBin = join(base, 'bin');
const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
const env = {
    ...process.env,
    [pathKey]: `${fakeBin}${delimiter}${process.env[pathKey] ?? ''}`,
    CODING_AGENT_GIT_NAME: 'Conformance',
    CODING_AGENT_GIT_EMAIL: 'conformance@example.test',
    GIT_AUTHOR_NAME: 'Conformance',
    GIT_AUTHOR_EMAIL: 'conformance@example.test',
    GIT_COMMITTER_NAME: 'Conformance',
    GIT_COMMITTER_EMAIL: 'conformance@example.test',
    FAKE_CODEX_LOG: join(base, 'fake-codex.log'),
    NO_COLOR: '1',
    PTBK_HOME: join(base, 'home'),
    OPENAI_API_KEY: '',
    CHROME_PATH: process.execPath,
    PTBK_HEALTH_CONNECTIVITY: 'off',
    PTBK_PRICE_LISTS: 'off',
    PTBK_KNOWLEDGE_SOURCES: 'off',
    PTBK_BROWSER_START: 'lazy',
    PTBK_HOST_UNLOCK: 'insecure-test-file',
};

/** Whether a path exists. */
async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

/** Runs the conformance build's CLI to completion. */
function ptbk(args, options = {}) {
    return execFileSync(process.execPath, [bin, ...args], { env, stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

/** Creates the throwaway project once (git repository, fake harness, ptbk init without starting). */
async function ensureProject() {
    if (await exists(join(project, 'ptbk.json'))) return;
    await mkdir(fakeBin, { recursive: true });
    await copyFile(join(root, 'test', 'fixtures', 'fake-codex.mjs'), join(fakeBin, 'codex.mjs'));
    await writeFile(join(fakeBin, 'codex'), `#!/bin/sh\nexec "${process.execPath}" "${join(fakeBin, 'codex.mjs')}" "$@"\n`);
    await writeFile(join(fakeBin, 'ptbk'), `#!/bin/sh\nexec "${process.execPath}" "${bin}" "$@"\n`);
    await chmod(join(fakeBin, 'codex'), 0o755);
    await chmod(join(fakeBin, 'ptbk'), 0o755);
    await mkdir(project, { recursive: true });
    const git = (args) => execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], { cwd: project, env, stdio: 'ignore' });
    git(['init', '--quiet']);
    git(['config', 'user.name', 'Conformance']);
    git(['config', 'user.email', 'conformance@example.test']);
    git(['config', 'commit.gpgsign', 'false']);
    ptbk(['init', '--path', project, '--non-interactive', '--installation', 'global', '--harness', 'openai-codex', '--raw', '--no-start']);
    const configPath = join(project, 'ptbk.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.discovery = { ...config.discovery, isEnabled: false };
    config.updates = { ...config.updates, isAutoUpdateEnabled: false };
    await writeFile(configPath, `${JSON.stringify(config, null, 4)}\n`);
    git(['commit', '-q', '--amend', '--no-edit', '--', 'ptbk.json']);
}

if (!(await exists(bin))) {
    process.stderr.write('Build the conformance build first: npm run build:conformance\n');
    process.exit(2);
}

if (process.argv[2] === 'conformance-session') {
    if (!(await exists(join(project, 'ptbk.json')))) {
        process.stdout.write('null\n');
        process.exit(0);
    }
    const child = spawn(process.execPath, [bin, 'conformance-session', '--path', project, '--raw', ...process.argv.slice(3)], { env, stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('exit', (code) => process.exit(code ?? 1));
} else {
    await ensureProject();
    const child = spawn(process.execPath, [bin, 'start', '--foreground', '--raw', '--no-server', '--no-persist', '--path', project], { env, stdio: ['ignore', 'inherit', 'inherit'] });
    // The harness signals the whole process group; a signal to this launcher alone reaches the engine too (a repeated
    // termination request is idempotent: the engine settles gracefully once).
    for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill('SIGTERM'));
    child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}
