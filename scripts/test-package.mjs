import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { validateRelease } from './validate-release.mjs';

/**
 * Packs the single `ptbk` package and verifies it the way users install it: project-local and global
 * installations in disposable folders (with spaces), then a real init → automatic daemon start → bootstrap task → stop cycle driven by a
 * deterministic harness substitute. Nothing touches the checkout or the system global prefix.
 */
const execute = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this check with `npm run test:package`.');
const temporary = await realpath(await mkdtemp(join(tmpdir(), 'ptbk package ')));

/**
 * The whole check normally takes 2-3 minutes. On Windows runners it sometimes never ended after reporting success
 * (0.119.0-125/126 hit the 60-minute job timeout), so a hang fails fast and names what is still alive.
 */
const watchdog = setTimeout(() => {
    const alive = process._getActiveHandles().map((handle) => [handle.constructor?.name, handle.pid, handle.spawnargs?.join(' ')].filter(Boolean).join(' '));
    process.stderr.write(`The package check did not finish within 15 minutes. Still alive: ${JSON.stringify(alive)}\n`);
    process.exit(1);
}, 15 * 60_000);

/**
 * Runs npm through its JavaScript entry point (works on Windows without a shell).
 */
function npm(args, cwd = repositoryRoot, env = process.env) {
    return execute(process.execPath, [npmCli, ...args], { cwd, env, timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
}

/**
 * Runs an installed `ptbk` link (cmd.exe shims on Windows).
 */
function linked(path, args, cwd, env = process.env) {
    if (process.platform === 'win32') {
        const command = [path, ...args].map((value) => `"${value}"`).join(' ');
        return execute('cmd.exe', ['/d', '/s', '/c', `"${command}"`], { cwd, env, timeout: 180_000, windowsVerbatimArguments: true, maxBuffer: 8 * 1024 * 1024 });
    }
    return execute(path, args, { cwd, env, timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
}

/**
 * Runs a link that is expected to fail and returns its result.
 */
async function linkedResult(path, args, cwd, env) {
    try {
        const { stdout, stderr } = await linked(path, args, cwd, env);
        return { code: 0, stdout, stderr };
    } catch (error) {
        return { code: error.code, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
    }
}

/**
 * Git with a fixture identity (no global author or signing needed).
 */
function git(cwd, args) {
    return execute('git', ['-c', 'commit.gpgsign=false', '-c', 'user.name=Package Fixture', '-c', 'user.email=fixture@example.test', ...args], { cwd });
}

let failure;
try {
    const release = await validateRelease();
    const { stdout } = await npm(['pack', '--ignore-scripts', '--json', '--pack-destination', temporary]);
    const packed = JSON.parse(stdout)[0];
    assert.equal(packed.name, 'ptbk');
    assert.equal(packed.version, release.version);
    const files = packed.files.map((file) => file.path.split('\\').join('/'));
    for (const required of [
        'book.mjs',
        'book.d.mts',
        'dist/book/book.d.ts',
        'dist/book/notation.d.ts',
        'bin/ptbk.js',
        'dist/cli.js',
        'dist/package.json',
        'dist/service/worker.js',
        'dist/service/supervisor.js',
        'dist/engine/mcp-server.js',
        'dist/service/spa/index.html',
        'dist/service/spa/app.js',
        'dist/expert/_main.md',
        'README.md',
        'LICENSE.md',
    ]) {
        assert(files.includes(required), `Missing package file: ${required}`);
    }
    // The installed engine must not retain the removed remote dashboard entry points or Expert contracts.
    for (const removed of ['dist/service/tunnel.js', 'dist/service/cloudflared.js', 'dist/cli/commands/access.js', 'dist/expert/cli/remote-access.md', 'dist/expert/cli/tunnel-options.md']) {
        assert(!files.includes(removed), `Removed remote dashboard file is still packaged: ${removed}`);
    }
    assert(!files.some((path) => /^(src|test|scripts|tasks|specs|agents|\.github|design|other|changelog)\//.test(path) || /(^|\/)\.env/.test(path)), 'The package includes repository-only files.');
    const tarball = join(temporary, packed.filename);

    // Deterministic harness substitute and a `git` identity for fixtures.
    const bin = join(temporary, 'fake bin');
    await mkdir(bin);
    await copyFile(join(repositoryRoot, 'test', 'fixtures', 'fake-codex.mjs'), join(bin, 'codex.mjs'));
    if (process.platform === 'win32') await writeFile(join(bin, 'codex.cmd'), `@echo off\r\n"${process.execPath}" "%~dp0codex.mjs" %*\r\n`);
    else {
        await writeFile(join(bin, 'codex'), `#!/bin/sh\nexec "${process.execPath}" "${join(bin, 'codex.mjs')}" "$@"\n`);
        await chmod(join(bin, 'codex'), 0o755);
    }
    const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
    const env = {
        ...process.env,
        [pathKey]: `${bin}${delimiter}${process.env[pathKey] ?? ''}`,
        GIT_AUTHOR_NAME: 'Package Fixture',
        GIT_AUTHOR_EMAIL: 'fixture@example.test',
        GIT_COMMITTER_NAME: 'Package Fixture',
        GIT_COMMITTER_EMAIL: 'fixture@example.test',
        PTBK_HOME: join(temporary, 'ptbk home'),
        NO_COLOR: '1',
    };

    // 1. Project-local installation (devDependency) used through the link, npm scripts and npx.
    const fixture = join(temporary, 'external project');
    await mkdir(fixture);
    await writeFile(join(fixture, 'package.json'), `${JSON.stringify({ name: 'ptbk-package-fixture', version: '1.0.0', private: true, scripts: { ptbk: 'ptbk', check: 'ptbk lint' } }, null, 2)}\n`);
    await writeFile(join(fixture, '.gitignore'), 'node_modules/\n');
    await npm(['install', '--save-dev', '--ignore-scripts', '--no-audit', '--no-fund', tarball], fixture);
    const book = await execute(process.execPath, ['--input-type=module', '-e', [
        "import { Book, book } from 'ptbk';",
        "import { Book as SubpathBook } from 'ptbk/book.mjs';",
        "if (Book !== SubpathBook) throw new Error('Expected the same Book class');",
        "process.stdout.write(book`\\n    AGENT Writer\\n    RULE Be brief.\\n`.rename('Editor').toString());",
    ].join('\n')], { cwd: fixture });
    assert.equal(book.stdout, 'AGENT Editor\nRULE Be brief.');
    // Resolve the public types and run the same edit in a bundle built for a browser.
    const consumer = join(fixture, 'consumer.mts');
    await writeFile(consumer, [
        "import { Book, book, type ModelRow } from 'ptbk';",
        "const rows: ModelRow[] = [{}];",
        "const draft: Book = book`TASK Draft`.rename('Demo').setModel(rows);",
        "export default draft.toString();",
    ].join('\n'));
    await writeFile(join(fixture, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { module: 'esnext', moduleResolution: 'bundler', target: 'es2022', types: [], strict: true, noEmit: true },
        files: ['consumer.mts'],
    }));
    await execute(process.execPath, [join(repositoryRoot, 'node_modules/typescript/bin/tsc'), '-p', fixture]);
    const browser = await build({ entryPoints: [consumer], bundle: true, platform: 'browser', format: 'esm', write: false });
    const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(browser.outputFiles[0].contents).toString('base64');
    assert.equal((await import(moduleUrl)).default, 'TASK Demo\nMODEL *');
    const local = join(fixture, 'node_modules', '.bin', process.platform === 'win32' ? 'ptbk.cmd' : 'ptbk');
    assert.equal((await linked(local, ['--version'], fixture)).stdout.trim(), release.version);
    assert.equal((await npm(['run', '--silent', 'ptbk', '--', '--version'], fixture)).stdout.trim(), release.version);
    assert.equal((await npm(['exec', '--offline', '--', 'ptbk', '--version'], fixture)).stdout.trim(), release.version);
    const esm = JSON.parse(await readFile(join(fixture, 'node_modules', 'ptbk', 'dist', 'package.json'), 'utf8'));
    assert.equal(esm.type, 'module');
    assert.equal(esm.private, true, 'The ESM boundary must never become another publishable package.');

    // Read-only commands never initialize a project.
    const bare = join(temporary, 'bare project');
    await mkdir(bare);
    assert.match((await linked(local, ['--path', bare, '--raw'], fixture)).stdout, /ptbk start/);
    assert.match((await linked(local, ['start', '--help', '--raw'], bare)).stdout, /ptbk start/);
    assert.deepEqual(await readdir(bare), [], 'Help must not initialize a project.');

    // 2. Global installation into a disposable prefix.
    const prefix = join(temporary, 'global prefix');
    await npm(['install', '--global', '--prefix', prefix, '--ignore-scripts', '--no-audit', '--no-fund', tarball], fixture);
    const global = process.platform === 'win32' ? join(prefix, 'ptbk.cmd') : join(prefix, 'bin', 'ptbk');
    assert.equal((await linked(global, ['--version'], bare)).stdout.trim(), release.version);

    // 3. Init (automatic background start) → the daemon executes the Expert bootstrap with the local installation.
    await git(fixture, ['init', '--quiet']);
    await git(fixture, ['add', '.']);
    await git(fixture, ['commit', '--quiet', '-m', 'External project baseline']);
    try {
        const init = await linkedResult(local, ['init', '--non-interactive', '--harness', 'openai-codex', '--check', 'npm run check', '--no-persist', '--raw'], fixture, env);
        assert.equal(init.code, 0, `${init.stdout}\n${init.stderr}`);
        assert.match(init.stdout, /^Project ready · agenda running/m);
        assert.doesNotMatch(init.stdout, /\x1b|[╭╮╰╯]/);
        // Agent-work subject: lowercase `ptbk: `, the executing agent's backtick-quoted visual and the task name.
        const bootstrapSubject = /^([0-9a-f]+) ptbk: `[^`\n]+` Review the initialized project — \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/m;
        const deadline = Date.now() + 90_000;
        let bootstrap;
        while (!(bootstrap = bootstrapSubject.exec((await git(fixture, ['log', '--format=%H %s'])).stdout))) {
            if (Date.now() > deadline) throw new Error('The started service did not complete the Expert bootstrap task.');
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
        }
        assert.match((await git(fixture, ['log', '-1', '--format=%B', bootstrap[1]])).stdout, /^Task-Name: Review the initialized project — \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/m);
        const snapshot = JSON.parse((await linked(global, ['status', '--json'], fixture, env)).stdout);
        assert.equal(snapshot.service.mode, 'daemon');
        assert.equal(snapshot.engine.version, release.version);
        assert.equal(await realpath(resolve(snapshot.engine.installation)), await realpath(join(fixture, 'node_modules', 'ptbk')), 'The daemon runs the project-local installation.');
        assert.match((await linked(local, ['start', '--raw'], fixture, env)).stdout, /^Already running/);
    } finally {
        await linkedResult(local, ['stop', '--after-task', '--raw'], fixture, env);
    }
    assert.equal(JSON.parse((await linked(local, ['status', '--json'], fixture, env)).stdout).service.state, 'stopped');
    assert.equal((await git(fixture, ['status', '--porcelain'])).stdout.trim(), '');

    // 4. A global invocation initializing a fresh folder installs the exact running version locally.
    const fresh = join(temporary, 'fresh project');
    const freshInit = await linkedResult(global, ['init', '--path', fresh, '--non-interactive', '--installation', 'local', '--harness', 'openai-codex', '--no-start', '--raw'], temporary, { ...env, PTBK_LOCAL_INSTALL_SPEC: tarball });
    assert.equal(freshInit.code, 0, `${freshInit.stdout}\n${freshInit.stderr}`);
    const manifest = JSON.parse(await readFile(join(fresh, 'package.json'), 'utf8'));
    assert(manifest.dependencies?.ptbk, 'ptbk is a regular dependency of the new project');
    assert.equal(JSON.parse(await readFile(join(fresh, 'node_modules', 'ptbk', 'package.json'), 'utf8')).version, release.version);
    assert.equal((await git(fresh, ['status', '--porcelain'])).stdout.trim(), '');
    process.stdout.write(`Packed ptbk@${release.version}: local/global installations, init with automatic start, Expert bootstrap commit, daemon lifecycle and destination-local installation passed.\n`);
} catch (error) {
    failure = error;
} finally {
    // Bounded: a disposable folder that Windows still keeps busy is left to the runner rather than blocking the check.
    const cleanup = rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }).catch(() => undefined);
    await Promise.race([cleanup, new Promise((resolvePromise) => setTimeout(resolvePromise, 60_000).unref())]);
}
clearTimeout(watchdog);
if (failure) process.stderr.write(`${failure.stack ?? failure}\n`);
// Exit explicitly once the result is reported: nothing left behind by the installed engine may keep the check open.
process.stdout.write('', () => process.exit(failure ? 1 : 0));
