import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

/** Exercise the real executable without sharing CLI state between fixtures. */
const execute = promisify(execFile);
/** Locate the executable from this installation rather than a global CLI. */
const executable = fileURLToPath(new URL('../bin/ptbk.js', import.meta.url));
/** Complete only local setup; integrations remain deferred without network or provider calls. */
const setupOptions = ['--no-install', '--no-self-update', '--non-interactive', '--harnesses', ''];

/** Create an external project with a private Git identity and no inherited harness routing. */
async function fixture(t) {
    const directory = await realpath(await mkdtemp(join(tmpdir(), 'ptbk check setup ')));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const project = join(directory, 'project');
    const globalConfiguration = join(directory, 'empty.gitconfig');
    await mkdir(project);
    await writeFile(globalConfiguration, '');
    const env = {
        ...process.env,
        GIT_CONFIG_GLOBAL: globalConfiguration, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0', GIT_CONFIG_PARAMETERS: '',
        GIT_AUTHOR_NAME: 'Check setup fixture', GIT_AUTHOR_EMAIL: 'fixture@example.test',
        GIT_COMMITTER_NAME: 'Check setup fixture', GIT_COMMITTER_EMAIL: 'fixture@example.test',
        CODING_AGENT_GIT_NAME: '', CODING_AGENT_GIT_EMAIL: '',
        PTBK_HARNESS: '', PTBK_MODEL: '', PTBK_THINKING_LEVEL: '',
    };
    /** Invoke one CLI operation within this fixture's configuration boundary. */
    const cli = async args => {
        try { return await execute(process.execPath, [executable, ...args, '--path', project], { cwd: project, env, timeout: 30_000 }); }
        catch (error) { if (args[0] === 'init' && error.code === 2 && /Unresolved prerequisites:/.test(error.stdout)) return error; throw error; }
    };
    /** Inspect only this disposable repository without interpolating paths in shell commands. */
    const git = args => execute('git', args, { cwd: project, env, timeout: 30_000 });
    return { project, cli, git, env };
}

/** Supply real non-software validation of the fixture's project material. */
async function projectValidation(project) {
    await writeFile(join(project, 'report.txt'), 'Reviewed project report\n');
    await writeFile(join(project, 'review-report.cjs'), 'throw new Error("Setup must not execute this temporary check");\n');
    await writeFile(join(project, 'validate.cjs'), "const assert = require('node:assert/strict');\nconst fs = require('node:fs');\nassert.equal(fs.readFileSync('report.txt', 'utf8'), 'Reviewed project report\\n');\n");
}

test('init stores a supplied missing project check and later start resolves it without repeating the option', async t => {
    const { project, cli, git } = await fixture(t);
    await projectValidation(project);
    await cli(['init', ...setupOptions]);
    const packageBefore = await readFile(join(project, 'package.json'), 'utf8');
    const initialized = await cli(['init', ...setupOptions, '--check', 'node validate.cjs']);
    const configuration = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.equal(configuration.execution.check, 'node validate.cjs');
    assert.equal(await readFile(join(project, 'package.json'), 'utf8'), packageBefore, 'A supplied command does not replace npm scripts');
    assert.equal(JSON.parse((await git(['show', 'HEAD:ptbk.json'])).stdout).execution.check, 'node validate.cjs', 'The selected check is part of the scoped setup commit');
    assert.doesNotMatch(initialized.stdout, /Configure a real project check command/);
    assert.match(initialized.stdout, /harness/i, 'Deferred integration setup remains visible');
    await git(['add', '--', 'report.txt', 'validate.cjs', 'review-report.cjs']);
    await git(['commit', '--quiet', '-m', 'Project validation material']);
    await assert.rejects(cli(['start', '--non-interactive', '--no-persist', '--no-server']), error => {
        assert.match(error.stderr, /harness|authenticated/i);
        assert.doesNotMatch(error.stderr, /Configure a real project check|Check setup error|unconfigured setup placeholder/);
        return true;
    });
    await assert.rejects(readFile(join(project, '.ptbk', 'process.json')), error => error.code === 'ENOENT');
});

test('repeated init reports an unresolved check with a corrective action instead of claiming readiness', async t => {
    const { project, cli, git } = await fixture(t);
    await writeFile(join(project, 'owner.txt'), 'Existing project purpose\n');
    await cli(['init', ...setupOptions]);
    const head = (await git(['rev-parse', 'HEAD'])).stdout;
    const configuration = await readFile(join(project, 'ptbk.json'), 'utf8');
    const manifest = await readFile(join(project, 'package.json'), 'utf8');
    const repeated = await cli(['init', ...setupOptions]);
    assert.match(repeated.stdout, /incomplete|unresolved/i);
    assert.doesNotMatch(repeated.stdout, /already ready|Setup complete/i);
    assert.match(repeated.stdout, /(?:ptbk init[^\n]*--check|ptbk\.json[^\n]*execution\.check)/);
    assert.equal((await git(['rev-parse', 'HEAD'])).stdout, head, 'Deferred setup never causes an empty commit');
    assert.equal(await readFile(join(project, 'ptbk.json'), 'utf8'), configuration);
    assert.equal(await readFile(join(project, 'package.json'), 'utf8'), manifest);
});

test('noninteractive start identifies how to configure missing validation before launching a supervisor', async t => {
    const { project, cli, git } = await fixture(t);
    await writeFile(join(project, 'owner.txt'), 'Existing project purpose\n');
    await cli(['init', ...setupOptions]);
    const head = (await git(['rev-parse', 'HEAD'])).stdout;
    const taskFiles = await readdir(join(project, 'tasks'));
    await assert.rejects(cli(['start', '--non-interactive', '--no-persist', '--no-server']), error => {
        assert.equal(error.code, 2);
        assert.match(error.stderr, /check|validation/i);
        assert.match(error.stderr, /(?:ptbk init[^\n]*--check|ptbk\.json[^\n]*execution\.check)/);
        assert.doesNotMatch(error.stderr, /No authenticated authorized harness/);
        return true;
    });
    assert.equal((await git(['rev-parse', 'HEAD'])).stdout, head);
    assert.deepEqual(await readdir(join(project, 'tasks')), taskFiles);
    await assert.rejects(readFile(join(project, '.ptbk', 'process.json')), error => error.code === 'ENOENT');
});

test('invalid explicit direct checks fail before fresh initialization changes project files', async t => {
    for (const command of ['', '   ', 'npx ptbk start', 'node -e "console.error(\'PTBK_CHECK_SETUP_REQUIRED\'); process.exit(1)"']) {
        const { project, cli } = await fixture(t);
        await assert.rejects(cli(['init', ...setupOptions, '--check', command]), error => {
            assert.equal(error.code, 2);
            assert.match(error.stderr, /check|validation/i);
            return true;
        });
        assert.deepEqual(await readdir(project), [], 'Rejected validation never authorizes setup mutations');
    }
});

test('a supplied npm command rejects an existing recursive or placeholder script before setup', async t => {
    for (const check of ['npm run nested', 'node -e "console.error(\'PTBK_CHECK_SETUP_REQUIRED\'); process.exit(1)"']) {
        const { project, cli } = await fixture(t);
        const manifest = JSON.stringify({ scripts: { check, nested: 'npm run check' } });
        await writeFile(join(project, 'package.json'), manifest);
        await assert.rejects(cli(['init', ...setupOptions, '--check', 'npm run check']), error => {
            assert.equal(error.code, 2);
            assert.match(error.stderr, /recursive|placeholder|unconfigured/);
            return true;
        });
        assert.deepEqual(await readdir(project), ['package.json']);
        assert.equal(await readFile(join(project, 'package.json'), 'utf8'), manifest);
    }
});

test('init preserves existing valid defaults and keeps an explicit different check temporary', async t => {
    const { project, cli, git } = await fixture(t);
    await projectValidation(project);
    await writeFile(join(project, 'package.json'), JSON.stringify({ scripts: { check: 'node validate.cjs', owner: 'echo owner' } }));
    await cli(['init', ...setupOptions]);
    const saved = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    saved.execution = { ...saved.execution, check: 'node validate.cjs', waitAfterError: 1234 };
    saved.routing = { context: 'Owner project instructions' };
    await writeFile(join(project, 'ptbk.json'), `${JSON.stringify(saved, null, 4)}\n`);
    await git(['add', '--', 'ptbk.json', 'report.txt', 'validate.cjs', 'review-report.cjs']);
    await git(['commit', '--quiet', '-m', 'Owner validation choices']);
    const configurationBefore = await readFile(join(project, 'ptbk.json'), 'utf8');
    const manifestBefore = await readFile(join(project, 'package.json'), 'utf8');
    const head = (await git(['rev-parse', 'HEAD'])).stdout;
    const initialized = await cli(['init', ...setupOptions, '--check', 'node review-report.cjs']);
    assert.equal(await readFile(join(project, 'ptbk.json'), 'utf8'), configurationBefore);
    assert.equal(await readFile(join(project, 'package.json'), 'utf8'), manifestBefore);
    assert.equal((await git(['rev-parse', 'HEAD'])).stdout, head);
    assert.match(initialized.stdout, /--check[^\n]*node review-report\.cjs/, 'The next invocation retains the temporary command');
    assert.match(initialized.stdout, /temporary|preserv/i);
});

test('check setup leaves overlapping owner configuration pending and preserves unrelated staging', async t => {
    const { project, cli, git } = await fixture(t);
    await projectValidation(project);
    await cli(['init', ...setupOptions]);
    await writeFile(join(project, 'owner.txt'), 'Owner baseline\n');
    await git(['add', '--', 'report.txt', 'validate.cjs', 'review-report.cjs', 'owner.txt']);
    await git(['commit', '--quiet', '-m', 'Owner baseline']);
    const head = (await git(['rev-parse', 'HEAD'])).stdout;
    const originalConfiguration = (await git(['show', 'HEAD:ptbk.json'])).stdout;
    const edited = JSON.parse(originalConfiguration);
    edited.execution = { waitAfterError: 1234 };
    await writeFile(join(project, 'ptbk.json'), `${JSON.stringify(edited, null, 4)}\n`);
    await writeFile(join(project, 'owner.txt'), 'Staged owner edit\n');
    await git(['add', '--', 'ptbk.json', 'owner.txt']);
    const staged = (await git(['ls-files', '--stage', '-z'])).stdout;
    const initialized = await cli(['init', ...setupOptions, '--check', 'node validate.cjs']);
    const current = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.equal(current.execution.check, 'node validate.cjs');
    assert.equal(current.execution.waitAfterError, 1234);
    assert.equal((await git(['rev-parse', 'HEAD'])).stdout, head, 'Overlapping setup edits do not commit owner work');
    assert.equal((await git(['show', 'HEAD:ptbk.json'])).stdout, originalConfiguration);
    assert.equal((await git(['ls-files', '--stage', '-z'])).stdout, staged, 'Setup retains every staged owner blob');
    assert.equal(await readFile(join(project, 'owner.txt'), 'utf8'), 'Staged owner edit\n');
    const pending = JSON.parse(await readFile(join(project, '.ptbk', 'initialization-pending.json'), 'utf8'));
    assert.ok(pending.paths.includes('ptbk.json'));
    assert.match(initialized.stdout, /review|pending/i);
});


test('successful init validates saved execution choices and leaves plain start ready without inference', async t => {
    const { project, cli, git, env } = await fixture(t);
    await projectValidation(project);
    await writeFile(join(project, 'package.json'), JSON.stringify({ scripts: { check: 'node validate.cjs' }, dependencies: { ptbk: '1.2.3' } }));
    await mkdir(join(project, 'node_modules', 'ptbk', 'bin'), { recursive: true });
    await mkdir(join(project, 'node_modules', '.bin'), { recursive: true });
    await writeFile(join(project, 'node_modules', 'ptbk', 'package.json'), JSON.stringify({ name: 'ptbk', version: '1.2.3', bin: 'bin/ptbk.js' }));
    await writeFile(join(project, 'node_modules', 'ptbk', 'bin', 'ptbk.js'), '// Installed local fixture engine\n');
    await writeFile(join(project, 'node_modules', '.bin', process.platform === 'win32' ? 'ptbk.cmd' : 'ptbk'), '// Installed link\n');
    const bin = join(project, '..', 'global-bin');
    await mkdir(bin);
    const record = join(bin, 'calls.jsonl');
    env.PATH = bin + (process.platform === 'win32' ? ';' : ':') + env.PATH;
    for (const name of ['claude', 'npm']) {
        const source = `#!${process.execPath}\nconst fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(record)},JSON.stringify({name:${JSON.stringify(name)},args})+'\\n');if(args.includes('--version'))console.log('claude 1.2.3');else if(args.includes('--help'))console.log('--output-format --effort --model --mcp-config --input-format --allowedTools');else if(args[0]==='auth'&&args[1]==='status')console.log(JSON.stringify({loggedIn:true,authMethod:'oauth'}));else if(args[0]==='view')console.log(JSON.stringify('1.2.3'));else throw Error('No execution, installation or login is authorized by this setup fixture');\n`;
        await writeFile(join(bin, process.platform === 'win32' ? name + '.cmd' : name), source, { mode: 0o755 });
    }
    await git(['init', '-q']);
    await git(['add', '--', 'package.json', 'report.txt', 'validate.cjs', 'review-report.cjs']);
    await git(['commit', '-qm', 'Existing project baseline']);
    const initialized = await cli(['init', '--harnesses', 'claude-code', '--no-self-update', '--non-interactive']);
    assert.equal(initialized.code, undefined, initialized.stdout);
    assert.match(initialized.stdout, /Prerequisites|Next: ptbk start/);
    assert.doesNotMatch(initialized.stdout, /Unresolved prerequisites|incomplete/);
    const saved = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.deepEqual(saved.harnesses, ['claude-code']);
    const firstRecord = await readFile(join(project, 'tasks', 'templates', 'initialization.json'), 'utf8');
    const head = (await git(['rev-parse', 'HEAD'])).stdout;
    await cli(['init', '--no-self-update', '--non-interactive']);
    assert.equal((await git(['rev-parse', 'HEAD'])).stdout, head);
    assert.equal(await readFile(join(project, 'tasks', 'templates', 'initialization.json'), 'utf8'), firstRecord);
    const calls = (await readFile(record, 'utf8')).trim().split('\n').map(JSON.parse);
    assert(calls.every(call => call.args.includes('--version') || call.args.includes('--help') || call.args[0] === 'auth' || call.args[0] === 'view'));
    const workspace = await import('../dist/coder/workspace.js').then(({ resolveWorkspace }) => resolveWorkspace({ path: project }));
    const readiness = await import('../dist/coder/initialization.js').then(({ inspectProjectReadiness }) => inspectProjectReadiness(workspace));
    assert.equal(readiness.ready, true);
    assert.deepEqual(readiness.execution, []);
});
