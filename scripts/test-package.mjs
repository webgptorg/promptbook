import { mkdtemp, mkdir, readFile, writeFile, rm, readdir, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, delimiter, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import assert from 'node:assert/strict';
import { validateRelease } from './validate-release.mjs';

/** Execute npm and installed CLI processes without a shell on Unix. */
const execute = promisify(execFile);
/** The checkout under test is independent of the caller's current project. */
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
/** Use npm's JavaScript entry point, including on Windows where .cmd needs a shell. */
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this smoke test with npm run test:package.');
/** Disposable installations never alter the checkout or the system global prefix. */
const temporary = await mkdtemp(join(tmpdir(), 'ptbk-package-'));

/** Run npm with isolated installation settings; no dependencies need lifecycle scripts. */
function npm(args, cwd = repositoryRoot) {
    return execute(process.execPath, [npmCli, ...args], { cwd, timeout: 60_000, maxBuffer: 2 * 1024 * 1024 });
}

/** Exercise installed links rather than just running the checkout's JavaScript file. */
function linkedCli(path, args, cwd, env = process.env) {
    if (process.platform === 'win32') {
        // cmd.exe needs explicit quotes around executable/arguments containing project spaces.
        const command = [path, ...args].map(value => `"${value}"`).join(' ');
        return execute('cmd.exe', ['/d', '/s', '/c', `"${command}"`], { cwd, env, timeout: 90_000, windowsVerbatimArguments: true });
    }
    return execute(path, args, { cwd, env, timeout: 90_000 });
}

try {
    const release = await validateRelease();
    const { stdout } = await npm(['pack', '--ignore-scripts', '--json', '--pack-destination', temporary]);
    const packed = JSON.parse(stdout)[0];
    assert.equal(packed.name, 'ptbk');
    assert.equal(packed.version, release.version);
    const files = packed.files.map(file => file.path);
    for (const required of ['bin/ptbk.js', 'dist/cli.js', 'dist/package.json', 'dist/coder/cli.js', 'dist/coder/service-worker.js', 'dist/coder/browser.js', 'README.md', 'LICENSE.md', 'docs/releasing.md', 'docs/runtime.md']) {
        assert(files.includes(required), `Missing package file: ${required}`);
    }
    assert(!files.some(path => /(?:^|\/)(?:\.env(?:\..*)?|node_modules|tasks|specs|src|test|scripts|\.github)(?:\/|$)/.test(path)), 'Package includes repository-only files.');
    const tarball = join(temporary, packed.filename);
    const fixture = join(temporary, 'external project');
    const globalPrefix = join(temporary, 'global prefix');
    await mkdir(fixture);
    await writeFile(join(fixture, 'package.json'), JSON.stringify({ name: 'ptbk-package-fixture', version: '99.0.0', private: true, scripts: { ptbk: 'ptbk', check: 'node -e "if(require(\'node:fs\').readFileSync(\'result.txt\',\'utf8\')!==\'accepted fixture\\n\')process.exit(1)"' } }, null, 2));
    await npm(['install', '--save-dev', '--ignore-scripts', '--no-audit', '--no-fund', tarball], fixture);
    const localLink = join(fixture, 'node_modules', '.bin', process.platform === 'win32' ? 'ptbk.cmd' : 'ptbk');
    assert.equal((await linkedCli(localLink, ['--version'], fixture)).stdout.trim(), release.version);
    const scripted = await npm(['run', '--silent', 'ptbk', '--', '--version'], fixture);
    assert.equal(scripted.stdout.trim(), release.version);
    const npx = await npm(['exec', '--offline', '--', 'ptbk', '--version'], fixture);
    assert.equal(npx.stdout.trim(), release.version);
    const installed = JSON.parse(await readFile(join(fixture, 'node_modules', 'ptbk', 'package.json'), 'utf8'));
    assert.equal(installed.bin.ptbk, 'bin/ptbk.js');
    const esm = JSON.parse(await readFile(join(fixture, 'node_modules', 'ptbk', 'dist', 'package.json'), 'utf8'));
    assert.equal(esm.type, 'module');
    assert.equal(esm.private, true, 'The ESM boundary must never become another publishable package.');
    const bareProject = join(temporary, 'empty project');
    await mkdir(bareProject);
    const instructions = await linkedCli(localLink, ['--path', bareProject], fixture);
    assert.match(instructions.stdout, /ptbk start/);
    const help = await linkedCli(localLink, ['start', '--help', '--path', bareProject], fixture);
    assert.match(help.stdout, /Usage: ptbk/);
    assert.deepEqual(await readdir(bareProject), [], 'Package inspection must not initialize a project.');
    await npm(['install', '--global', '--prefix', globalPrefix, '--ignore-scripts', '--no-audit', '--no-fund', tarball], fixture);
    const globalLink = process.platform === 'win32' ? join(globalPrefix, 'ptbk.cmd') : join(globalPrefix, 'bin', 'ptbk');
    assert.equal((await linkedCli(globalLink, ['--version'], bareProject)).stdout.trim(), release.version);
    assert.match((await linkedCli(globalLink, ['--help'], bareProject)).stdout, /ptbk/);
    // Use a deterministic installed-provider substitute. No account, inference or system-global tool install is used.
    const providers = join(temporary, 'fixture providers');
    await mkdir(providers);
    await writeFile(join(providers, 'opencode'), '#!' + process.execPath + '\n' + `
const args = process.argv.slice(2);
if (args.includes('--help')) { console.log('--variant --format --model'); process.exit(0); }
if (args.includes('--version')) { console.log('1.0.0'); process.exit(0); }
if (args[0] === 'auth') { console.log('1 credentials oauth'); process.exit(0); }
if (args[0] === 'models') { console.log('fixture/model'); process.exit(0); }
(async () => {
const configuration = JSON.parse(process.env.OPENCODE_CONFIG_CONTENT || '{}');
if (configuration.mcp?.ptbk) {
    const client = configuration.mcp.ptbk.command[1];
    const source = require('node:fs').readFileSync(client, 'utf8');
    const url = JSON.parse(source.match(/const url = (.*);/)[1]);
    for (const method of ['initialize', 'tools/list']) {
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method }) });
    }
}
if (args[0] === 'mcp') { console.log('Verified fixture native tool discovery'); return; }
require('node:fs').writeFileSync('result.txt', 'accepted fixture\\n');
console.log(JSON.stringify({type:'text',part:{text:'PTBK_ACCEPTANCE {"satisfied":true,"evidence":"Created result.txt and ran the project check."}'}}));
})().catch(error => { console.error(error); process.exitCode = 1; });
`, { mode: 0o755 });
    const env = { ...process.env, PATH: providers + delimiter + process.env.PATH };
    await execute('git', ['init', '--quiet'], { cwd: fixture });
    await execute('git', ['config', 'user.name', 'Package Fixture'], { cwd: fixture });
    await execute('git', ['config', 'user.email', 'fixture@example.test'], { cwd: fixture });
    await execute('git', ['config', 'commit.gpgsign', 'false'], { cwd: fixture });
    await writeFile(join(fixture, '.gitignore'), 'node_modules/\n');
    await execute('git', ['add', '.'], { cwd: fixture });
    await execute('git', ['commit', '--quiet', '-m', 'External project baseline'], { cwd: fixture });
    await assert.rejects(linkedCli(localLink, ['init', '--no-install', '--no-questions', '--commit'], fixture, env), error => error.code === 2 && /Unresolved prerequisites:/.test(error.stdout));
    const starter = (await readdir(join(fixture, 'tasks'))).find(name => name.endsWith('.book'));
    await rm(join(fixture, 'tasks', starter)); // The package execution fixture exercises its own explicit task.
    await writeFile(join(fixture, 'agents', 'developer.book'), 'Developer\nFROM Void\nRULE Implement and verify the fixture.\nCLOSED\n');
    await execute('git', ['add', '.'], { cwd: fixture });
    await execute('git', ['commit', '--quiet', '-m', 'Fixture project configuration'], { cwd: fixture });
    await linkedCli(localLink, ['add', 'Create result.txt with accepted fixture and verify it', '--no-questions', '--commit'], fixture, env);
    const before = Number((await execute('git', ['rev-list', '--count', 'HEAD'], { cwd: fixture })).stdout.trim());
    const preview = JSON.parse((await linkedCli(globalLink, ['run', '--dry-run', '--json'], fixture, env)).stdout);
    assert.equal(preview.tasks.length, 1);
    assert.equal(preview.tasks[0].kind, 'ready');
    const result = await linkedCli(localLink, ['run', '--harness', 'opencode', '--agent', 'Developer', '--limit', '1', '--check', 'npm run check', '--no-questions', '--no-ui'], fixture, env);
    assert.match(result.stdout, /1 completed, 0 failed/);
    assert.equal(await readFile(join(fixture, 'result.txt'), 'utf8'), 'accepted fixture\n');
    assert.equal(Number((await execute('git', ['rev-list', '--count', 'HEAD'], { cwd: fixture })).stdout.trim()), before + 1);
    assert.equal((await execute('git', ['status', '--porcelain'], { cwd: fixture })).stdout, '');
    const completed = JSON.parse((await linkedCli(globalLink, ['list', '--json'], fixture, env)).stdout).tasks[0];
    assert.equal(completed.status, 'done');
    assert.match(await readFile(join(fixture, completed.source), 'utf8'), /TASK DONE \d{4}-\d{2}-\d{2}T/);
    // Exercise the actual installed worker in a detached process with a future-only agenda.
    await writeFile(join(fixture, 'tasks', 'future.book'), 'TASK Future packaged work\nTASK ID packaged-future\nTASK AGENT @Developer\nTASK HARNESS opencode\nTASK AFTER 2099-01-01T00:00:00Z\n\nDo not execute before its earliest start.\n');
    await execute('git', ['add', '--', 'tasks/future.book'], { cwd: fixture });
    await execute('git', ['commit', '--quiet', '-m', 'Future packaged agenda'], { cwd: fixture });
    try {
        const started = await linkedCli(localLink, ['start', '--raw', '--daemon', '--no-persist', '--no-server', '--no-qr', '--harness', 'opencode'], fixture, env);
        assert.match(started.stdout, /ptbk started/);
        assert.doesNotMatch(started.stdout, /\u001b|[┌┐└┘│]/);
        const first = JSON.parse((await linkedCli(globalLink, ['show', '--json'], fixture, env)).stdout);
        assert.equal(first.mode, 'daemon'); assert.equal(first.url, undefined); assert.equal(first.persistent, false);
        const record = JSON.parse(await readFile(join(fixture, '.ptbk', 'process.json'), 'utf8'));
        assert.equal(await realpath(resolve(record.installation)), await realpath(resolve(fixture, 'node_modules', 'ptbk')));
        const repeated = await linkedCli(localLink, ['start'], fixture, env);
        assert.match(repeated.stdout, /already running/);
        assert.equal(JSON.parse((await linkedCli(localLink, ['status', '--json'], fixture, env)).stdout).pid, first.pid);
        await linkedCli(localLink, ['restart', '--no-qr'], fixture, env);
        const restarted = JSON.parse((await linkedCli(localLink, ['show', '--json'], fixture, env)).stdout);
        assert.notEqual(restarted.id, first.id);
        assert.equal(restarted.persistent, false, 'An explicit restart option must preserve saved no-persist');
        assert.equal(restarted.url, undefined, 'An explicit restart option must preserve saved no-server');
        assert.equal(restarted.tasks.find(task => task.id === 'packaged-future').eligibility.kind, 'waiting-until');
    } finally { await linkedCli(localLink, ['stop'], fixture, env); }
    assert.equal(JSON.parse((await linkedCli(localLink, ['status', '--json'], fixture, env)).stdout).status, 'stopped');
    process.stdout.write(`Packed ptbk@${release.version}: local/global installation, checked single-commit execution, raw daemon launch, installed identity, repeated start, restart preferences and intentional stop passed.\n`);
} finally {
    await rm(temporary, { recursive: true, force: true });
}
