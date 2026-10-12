import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { HARNESS_REGISTRY, getHarnessCatalog, runHarness } from '../dist/coder/harness.js';
import { HARNESS_PLUGINS, getHarnessPlugin } from '../dist/coder/harness-plugins/index.js';
import { compareHarnessVersions } from '../dist/coder/harness-plugins/shared.js';
import { acquireHarnessUsage, withHarnessUpdate } from '../dist/coder/harness-plugins/locks.js';
import { inspectHarnesses, setupHarnesses, checkHarnessUpdates, maintainHarnesses } from '../dist/coder/setup.js';

/** Fake global npm/provider executables make every metadata/update check account- and network-free. */
async function fixture(t) {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-plugin-')));
    const project = join(root, 'project'); const bin = join(root, 'global-bin');
    const modules = join(root, 'global-modules'); const packagePath = join(modules, '@anthropic-ai', 'claude-code');
    const locks = join(root, 'locks'); const record = join(root, 'commands.jsonl'); const version = join(root, 'version');
    await mkdir(project); await mkdir(bin); await mkdir(packagePath, { recursive: true });
    await writeFile(version, '1.2.3'); await writeFile(record, '');
    const before = { ...process.env };
    Object.assign(process.env, { PATH: bin, PTBK_PLUGIN_RECORD: record, PTBK_PLUGIN_VERSION: version, PTBK_PLUGIN_MODULES: modules, PTBK_PLUGIN_LATEST: '1.3.0' });
    delete process.env.PTBK_PLUGIN_NPM_FAIL; delete process.env.PTBK_PLUGIN_NO_REPLACE;
    t.after(async () => { for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]; Object.assign(process.env, before); await rm(root, { recursive: true, force: true }); });
    const provider = `#!${process.execPath}\nconst fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(process.env.PTBK_PLUGIN_RECORD,JSON.stringify({name:'claude',args})+'\\n');if(args.includes('--version'))console.log('claude '+fs.readFileSync(process.env.PTBK_PLUGIN_VERSION,'utf8'));else if(args[0]==='auth'&&args[1]==='status')console.log(JSON.stringify({loggedIn:true,authMethod:'oauth'}));else if(args.includes('--help'))console.log('--output-format --effort');else if(args[0]==='auth')throw Error('Healthy login must never be repeated');\n`;
    await writeFile(join(packagePath, 'cli.js'), provider, { mode: 0o755 });
    await symlink(join(packagePath, 'cli.js'), join(bin, 'claude'));
    for (const definition of HARNESS_REGISTRY.filter(entry => entry.executable !== 'claude')) {
        await writeFile(join(bin, definition.executable), `#!${process.execPath}\nrequire('node:fs').appendFileSync(process.env.PTBK_PLUGIN_RECORD,JSON.stringify({name:${JSON.stringify(definition.executable)},args:process.argv.slice(2)})+'\\n');process.exit(1);\n`, { mode: 0o755 });
    }
    await writeFile(join(bin, process.platform === 'win32' ? 'npm.cmd' : 'npm'), `#!${process.execPath}\nconst fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(process.env.PTBK_PLUGIN_RECORD,JSON.stringify({name:'npm',args,cwd:process.cwd()})+'\\n');if(process.env.PTBK_PLUGIN_NPM_FAIL==='1'){console.error('fixture offline or permission denied');process.exit(1);}if(args[0]==='view')console.log(JSON.stringify(process.env.PTBK_PLUGIN_LATEST));else if(args[0]==='root')console.log(process.env.PTBK_PLUGIN_MODULES);else if(args[0]==='install'&&process.env.PTBK_PLUGIN_NO_REPLACE!=='1')fs.writeFileSync(process.env.PTBK_PLUGIN_VERSION,process.env.PTBK_PLUGIN_LATEST);\n`, { mode: 0o755 });
    return { root, project, bin, locks, record, version, options: { names: ['claude-code'], lockPath: locks } };
}

/** Decode the actual bounded fixture subprocess invocations. */
async function commands(record) { return (await readFile(record, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); }

test('every integration supplies a common contract, and featured catalog preserves ordinary selections', () => {
    assert.equal(HARNESS_PLUGINS.length, 7);
    for (const plugin of HARNESS_PLUGINS) for (const operation of ['inspect', 'installGlobal', 'setupNative', 'checkVersion', 'updateGlobal', 'configure', 'version', 'help', 'authenticate', 'prepare', 'execute']) assert.equal(typeof plugin[operation], 'function');
    assert.deepEqual(getHarnessCatalog().map(entry => entry.displayName), ['OpenAI Codex', 'Claude Code']);
    assert.deepEqual(getHarnessCatalog({ selected: ['gemini'] }).map(entry => entry.id), ['openai-codex', 'claude-code', 'gemini']);
    assert.equal(getHarnessCatalog({ includeMore: true }).length, 7);
    assert.deepEqual(getHarnessCatalog({ query: 'copilot' }).map(entry => entry.id), ['github-copilot']);
    assert.equal(getHarnessCatalog({ includeMore: true, offset: 2, limit: 2 }).length, 2);
});

test('selected-only discovery/setup reuse a healthy native login without touching other integrations', async t => {
    const { project, record, options } = await fixture(t);
    const inventory = await inspectHarnesses(project, options);
    assert.equal(inventory.length, 1); assert.equal(inventory[0].usable, true);
    await setupHarnesses(project, { ...options, login: true, interactive: true, checkUpdates: false, onOutput() {} });
    assert.deepEqual(await setupHarnesses(project), []);
    const actual = await commands(record);
    assert.ok(actual.every(command => command.name === 'claude'));
    assert.ok(actual.every(command => command.args[1] !== 'login'));
});

test('read-only inventory never performs version-network checks or updates and project dependencies are rejected', async t => {
    const { project, bin, record, options } = await fixture(t);
    await inspectHarnesses(project, options);
    assert.ok((await commands(record)).every(command => command.name !== 'npm'));
    const local = join(project, 'node_modules', '.bin'); await mkdir(local, { recursive: true });
    await symlink(join(bin, 'claude'), join(local, 'claude')); process.env.PATH = local;
    const inventory = await inspectHarnesses(project, options);
    assert.equal(inventory[0].installed, false); assert.match(inventory[0].diagnostic, /project-local.*globally/);
});

test('setup chooser contains only outdated selected installations and declining keeps readiness', async t => {
    const { project, record, options } = await fixture(t);
    let choices = 0;
    const inventory = await setupHarnesses(project, { ...options, onOutput() {}, chooseUpdates: async outdated => { choices++; assert.deepEqual(outdated.map(entry => entry.name), ['claude-code']); return 'keep'; } });
    assert.equal(choices, 1); assert.equal(inventory[0].usable, true); assert.equal(inventory[0].version, '1.2.3');
    assert.ok((await commands(record)).every(command => command.name === 'claude' || command.name === 'npm' && command.args[0] === 'view'));
    process.env.PTBK_PLUGIN_LATEST = '1.2.3';
    await setupHarnesses(project, { ...options, onOutput() {}, chooseUpdates: async () => { assert.fail('Current harness needs no chooser'); } });
});

test('version probes distinguish unknown latest versions and prereleases from proved currency', async t => {
    const { project, options } = await fixture(t);
    process.env.PTBK_PLUGIN_NPM_FAIL = '1';
    const check = (await checkHarnessUpdates(project, options))[0];
    assert.equal(check.outcome, 'unknown'); assert.match(check.diagnostic, /fixture offline/);
    assert.equal(compareHarnessVersions('2.0.0-beta.2', '2.0.0-beta.10'), -1);
    assert.equal(compareHarnessVersions('2.0.0', '2.0.0-beta.10'), 1);
    assert.equal(compareHarnessVersions('garbage', '2.0.0'), undefined);
});

test('global updates verify the actual resulting version/readiness and bounded checks avoid repeated probes', async t => {
    const { project, record, options } = await fixture(t);
    const result = (await maintainHarnesses(project, { ...options, now: () => 1_000_000, onOutput() {} }))[0];
    assert.equal(result.outcome, 'updated'); assert.equal(result.currentVersion, '1.3.0'); assert.equal(result.usable, true);
    const first = await commands(record);
    const installs = first.filter(command => command.name === 'npm' && command.args[0] === 'install');
    assert.equal(installs.length, 1); assert.ok(installs[0].args.includes('--global')); assert.notEqual(installs[0].cwd, project);
    await maintainHarnesses(project, { ...options, now: () => 1_010_000 });
    assert.equal((await commands(record)).length, first.length);
    await maintainHarnesses(project, { ...options, autoUpdate: false, force: true });
    assert.equal((await commands(record)).length, first.length);
    await maintainHarnesses(project, { ...options, now: () => 3_000_000 });
    assert.equal((await commands(record)).filter(command => command.name === 'npm' && command.args[0] === 'view').length, 2);
});

test('successful update command without replaced executable is failed, and unsupported native installs stay usable', async t => {
    const { project, options, bin } = await fixture(t);
    process.env.PTBK_PLUGIN_NO_REPLACE = '1';
    const result = (await maintainHarnesses(project, { ...options, onOutput() {}, force: true }))[0];
    assert.equal(result.outcome, 'failed'); assert.equal(result.currentVersion, '1.2.3'); assert.equal(result.usable, true);
    delete process.env.PTBK_PLUGIN_NO_REPLACE;
    const script = await readFile(join(bin, 'claude'), 'utf8'); await rm(join(bin, 'claude')); await writeFile(join(bin, 'claude'), script, { mode: 0o755 });
    const unsupported = (await maintainHarnesses(project, { ...options, onOutput() {}, force: true }))[0];
    assert.equal(unsupported.outcome, 'unsupported'); assert.equal(unsupported.usable, true); assert.match(unsupported.diagnostic, /native updater|native installation/);
});

test('unknown/offline maintenance outcomes are visible and cached instead of tight retry loops', async t => {
    const { project, options, record } = await fixture(t);
    process.env.PTBK_PLUGIN_NPM_FAIL = '1'; let output = '';
    const result = (await maintainHarnesses(project, { ...options, now: () => 1_000_000, onOutput: text => output += text }))[0];
    assert.equal(result.outcome, 'unknown'); assert.equal(result.usable, true); assert.match(output, /unknown.*offline/s);
    const count = (await commands(record)).length;
    await maintainHarnesses(project, { ...options, now: () => 1_010_000 });
    assert.equal((await commands(record)).length, count);
});

test('an active invocation in another process defers replacement of the shared global installation', async t => {
    const { locks } = await fixture(t);
    const moduleUrl = new URL('../dist/coder/harness-plugins/locks.js', import.meta.url).href;
    const child = spawn(process.execPath, ['--input-type=module', '-e', `import { acquireHarnessUsage } from ${JSON.stringify(moduleUrl)}; const release = await acquireHarnessUsage('claude-code', {lockPath:${JSON.stringify(locks)}}); console.log('ready'); process.stdin.once('data', async () => {await release(); process.exit(0);});`], { stdio: ['pipe', 'pipe', 'pipe'] });
    t.after(() => { child.kill('SIGTERM'); });
    await new Promise((accept, reject) => { child.stdout.once('data', accept); child.once('error', reject); child.once('exit', code => { if (code !== 0) reject(new Error('Fixture lease process failed')); }); });
    let calls = 0;
    const deferred = await withHarnessUpdate('claude-code', async () => { calls++; return { name: 'claude-code', outcome: 'updated', diagnostic: 'verified' }; }, { lockPath: locks });
    assert.equal(deferred.outcome, 'deferred'); assert.equal(calls, 0);
    const ended = new Promise(accept => child.once('exit', accept)); child.stdin.write('release'); await ended;
    const updated = await withHarnessUpdate('claude-code', async () => { calls++; return { name: 'claude-code', outcome: 'updated', diagnostic: 'verified' }; }, { lockPath: locks });
    assert.equal(updated.outcome, 'updated'); assert.equal(calls, 1);
});

test('parallel invocations coexist, and startup waits for a held global update gate', async t => {
    const { locks } = await fixture(t);
    const first = await acquireHarnessUsage('claude-code', { lockPath: locks });
    const second = await acquireHarnessUsage('claude-code', { lockPath: locks });
    await first();
    assert.equal((await withHarnessUpdate('claude-code', async () => assert.fail('Second invocation is active'), { lockPath: locks })).outcome, 'deferred');
    await second();
    let release; const held = new Promise(accept => { release = accept; });
    let started; const ready = new Promise(accept => { started = accept; });
    const update = withHarnessUpdate('claude-code', async () => { started(); await held; return { name: 'claude-code', outcome: 'updated', diagnostic: 'verified' }; }, { lockPath: locks });
    await ready;
    let entered = false;
    const entering = acquireHarnessUsage('claude-code', { lockPath: locks }).then(release => { entered = true; return release; });
    await delay(20); assert.equal(entered, false);
    release(); await update; await (await entering)();
});


test('native reference capabilities reject unsupported settings and apply supported keys only to scoped environments', async t => {
    const { project, options } = await fixture(t);
    const unsupported = await inspectHarnesses(project, { ...options, harnessSettings: { 'claude-code': { configurationPath: 'native.json' } } });
    assert.equal(unsupported[0].configured, false); assert.equal(unsupported[0].usable, false);
    assert.match(unsupported[0].diagnostic, /does not support configurationPath/);
    let output = '';
    await setupHarnesses(project, { ...options, harnessSettings: { 'claude-code': { configurationPath: 'native.json' } }, login: true, interactive: true, checkUpdates: false, onOutput: text => output += text });
    assert.match(output, /configuration required/); assert.doesNotMatch(output, /authentication required/);
    const priorKey = process.env.ANTHROPIC_API_KEY;
    const env = { CUSTOM_VALUE: 'fixture-custom-key' };
    const claude = getHarnessPlugin('claude-code');
    await claude.configure({ projectPath: project, harness: 'claude-code', prompt: 'Task', harnessConfiguration: { apiKeyEnv: 'CUSTOM_VALUE' } }, env);
    assert.equal(env.ANTHROPIC_API_KEY, 'fixture-custom-key'); assert.equal(process.env.ANTHROPIC_API_KEY, priorKey);
    await assert.rejects(claude.configure({ projectPath: project, harness: 'claude-code', prompt: 'Task', harnessConfiguration: { apiKeyEnv: 'MISSING_KEY' } }, {}), /requires the configured environment variable/);
    await assert.rejects(getHarnessPlugin('cline').configure({ projectPath: project, harness: 'cline', prompt: 'Task', harnessConfiguration: { apiKeyEnv: 'CUSTOM_VALUE' } }, env), /does not support apiKeyEnv/);
});

test('actual invocation version is captured under usage ownership and custom credential references remain redacted', async t => {
    const { project, bin } = await fixture(t);
    await rm(join(bin, 'claude'));
    await writeFile(join(bin, 'claude'), `#!${process.execPath}\nconst args=process.argv.slice(2);if(args.includes('--help'))console.log('--output-format');else if(args.includes('--version'))console.log('claude 1.2.3');else{process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({type:'result',is_error:false,result:process.env.ANTHROPIC_API_KEY})));}\n`, { mode: 0o755 });
    process.env.CUSTOM_VALUE = 'fixture-custom-key-must-be-redacted';
    let visible = '';
    const result = await runHarness({ projectPath: project, harness: 'claude-code', prompt: 'Task', harnessConfiguration: { apiKeyEnv: 'CUSTOM_VALUE' }, onOutput: text => visible += text });
    assert.equal(result.outcome, 'success'); assert.equal(result.harnessVersion, '1.2.3');
    assert.equal(result.output.includes(process.env.CUSTOM_VALUE), false); assert.equal(visible.includes(process.env.CUSTOM_VALUE), false); assert.match(result.output, /REDACTED/);
});


test('unavailable global maintenance storage is actionable and retains usable existing versions without tight retries', async t => {
    const { project, root, record } = await fixture(t);
    const unavailable = join(root, 'not-a-directory'); await writeFile(unavailable, 'existing user file');
    const options = { names: ['claude-code'], lockPath: unavailable, now: () => 1_000_000 };
    let output = '';
    const result = (await maintainHarnesses(project, { ...options, onOutput: text => output += text }))[0];
    assert.equal(result.outcome, 'failed'); assert.equal(result.usable, true); assert.equal(result.currentVersion, '1.2.3');
    assert.match(result.diagnostic, /maintenance state is unavailable|persist global maintenance/); assert.match(output, /failed/);
    assert.equal(await readFile(unavailable, 'utf8'), 'existing user file');
    const count = (await commands(record)).length;
    await maintainHarnesses(project, options); assert.equal((await commands(record)).length, count);
});


test('abandoned usage ownership is preserved because a detached provider may survive its parent', async t => {
    const { locks } = await fixture(t);
    const moduleUrl = new URL('../dist/coder/harness-plugins/locks.js', import.meta.url).href;
    const child = spawn(process.execPath, ['--input-type=module', '-e', `import { acquireHarnessUsage } from ${JSON.stringify(moduleUrl)}; await acquireHarnessUsage('claude-code', {lockPath:${JSON.stringify(locks)}});`], { stdio: 'ignore' });
    await new Promise((accept, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? accept() : reject(new Error('Fixture abandoned lease process failed'))); });
    const result = await withHarnessUpdate('claude-code', async () => assert.fail('Invocation completion is unknown'), { lockPath: locks });
    assert.equal(result.outcome, 'deferred'); assert.match(result.diagnostic, /detached provider may still be running/);
});

test('failed metadata probes cannot expose an arbitrarily named configured credential', async t => {
    const { project, bin } = await fixture(t);
    await rm(join(bin, 'claude'));
    await writeFile(join(bin, 'claude'), `#!${process.execPath}\nconsole.error(process.env.CUSTOM_VALUE);process.exit(1);\n`, { mode: 0o755 });
    process.env.CUSTOM_VALUE = 'fixture-credential-before-native-probes';
    const result = await runHarness({ projectPath: project, harness: 'claude-code', prompt: 'Never execute this task', harnessConfiguration: { apiKeyEnv: 'CUSTOM_VALUE' } });
    assert.equal(result.outcome, 'configuration');
    assert(!result.output.includes(process.env.CUSTOM_VALUE));
    assert.match(result.output, /REDACTED/);
});
