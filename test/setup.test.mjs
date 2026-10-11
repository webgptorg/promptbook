import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { inspectHarnesses, setupHarnesses } from '../dist/coder/setup.js';
import { HARNESS_REGISTRY } from '../dist/coder/harness.js';

/** All provider probes are fixture executables; none can reach an account or inference API. */
async function fixture(t) {
    const project = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-setup-')));
    const bin = join(project, 'bin'); const home = join(project, 'home');
    await mkdir(bin); await mkdir(home);
    const previous = { ...process.env };
    process.env.PATH = bin;
    process.env.PTBK_FIXTURE_RECORD = join(project, 'commands.jsonl');
    for (const key of ['OPENAI_API_KEY', 'CODEX_API_KEY', 'PTBK_OPENAI_CODEX_USE_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'DASHSCOPE_API_KEY', 'GITHUB_TOKEN', 'GH_TOKEN', 'COPILOT_GITHUB_TOKEN', 'COPILOT_PROVIDER_API_KEY', 'COPILOT_PROVIDER_BASE_URL', 'CLINE_PROVIDER_SETTINGS_PATH', 'CLINE_DATA_DIR']) delete process.env[key];
    t.after(async () => { for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env, previous); await rm(project, { recursive: true, force: true }); });
    return { project, bin, home };
}

/** Safe metadata stub supports direct args and native Codex JSON-RPC, never a prompt. */
function providerScript(name) {
    return `#!${process.execPath}\nconst fs=require('node:fs');const readline=require('node:readline');const args=process.argv.slice(2);fs.appendFileSync(process.env.PTBK_FIXTURE_RECORD,JSON.stringify({name:${JSON.stringify(name)},args})+'\\n');
if(args.includes('--version'))console.log('fixture 1.2.3');
else if(${JSON.stringify(name)}==='codex'&&args[0]==='login')console.log(process.env.PTBK_FIXTURE_LOGGED_IN==='1'?'Logged in using ChatGPT':'Not logged in');
else if(${JSON.stringify(name)}==='codex'&&args[0]==='app-server'){const input=readline.createInterface({input:process.stdin});input.on('line',line=>{const m=JSON.parse(line);if(m.id)console.log(JSON.stringify({jsonrpc:'2.0',id:m.id,result:m.method==='model/list'?{data:[{model:'fixture-model-from-adapter'}]}:{}}));});}
else if(${JSON.stringify(name)}==='claude')console.log(JSON.stringify({loggedIn:false}));
else if(${JSON.stringify(name)}==='opencode'&&args[0]==='auth')console.log('0 credentials');
else if(${JSON.stringify(name)}==='opencode'&&args[0]==='models')console.log('fixture/installed-model');
else if(${JSON.stringify(name)}==='copilot')process.exit(1);
else process.exit(0);\n`;
}

test('inventory differentiates installation/login and reports adapter models without creating project state', async t => {
    const { project, bin, home } = await fixture(t);
    for (const { executable } of HARNESS_REGISTRY) await writeFile(join(bin, executable), providerScript(executable), { mode: 0o755 });
    let inventory = await inspectHarnesses(project, { homePath: home });
    assert.equal(inventory.length, 7);
    assert.ok(inventory.every(entry => entry.installed));
    assert.ok(inventory.every(entry => !entry.usable));
    assert.equal(inventory.find(entry => entry.name === 'claude-code').authenticated, false);
    assert.deepEqual(inventory.find(entry => entry.name === 'opencode').models, ['fixture/installed-model']);
    process.env.PTBK_FIXTURE_LOGGED_IN = '1';
    inventory = await inspectHarnesses(project, { homePath: home });
    assert.equal(inventory.find(entry => entry.name === 'openai-codex').usable, true);
    assert.deepEqual(inventory.find(entry => entry.name === 'openai-codex').models, ['fixture-model-from-adapter']);
    assert.ok(!(await readdir(project)).includes('.ptbk'));
    const commands = (await readFile(process.env.PTBK_FIXTURE_RECORD, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.ok(commands.every(command => !command.args.includes('--prompt') && command.args[0] !== 'exec'));
});

test('Codex API keys require explicit opt-in and credential configuration never appears in inventory', async t => {
    const { project, bin, home } = await fixture(t);
    await writeFile(join(bin, 'codex'), providerScript('codex'), { mode: 0o755 });
    process.env.OPENAI_API_KEY = 'fixture-secret-never-in-inventory';
    let inventory = await inspectHarnesses(project, { homePath: home });
    assert.equal(inventory.find(entry => entry.name === 'openai-codex').usable, false);
    process.env.PTBK_OPENAI_CODEX_USE_API_KEY = '1';
    inventory = await inspectHarnesses(project, { homePath: home });
    const codex = inventory.find(entry => entry.name === 'openai-codex');
    assert.equal(codex.authentication, 'api'); assert.equal(codex.usable, true);
    assert.equal(JSON.stringify(inventory).includes(process.env.OPENAI_API_KEY), false);
    assert.ok(inventory.filter(entry => entry.name !== 'openai-codex').every(entry => !entry.installed));
});

test('setup reports failed global installations accurately and guides noninteractive login without waiting', async t => {
    const { project, bin, home } = await fixture(t);
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await writeFile(join(bin, npm), `#!${process.execPath}\nconsole.error('fixture installation denied');process.exit(1);\n`, { mode: 0o755 });
    let output = '';
    const inventory = await setupHarnesses(project, { names: ['claude-code'], install: true, login: true, interactive: false, homePath: home, onOutput: text => output += text });
    assert.equal(inventory.find(entry => entry.name === 'claude-code').installed, false);
    assert.match(output, /installation failed:.*fixture installation denied/s);
    await writeFile(join(bin, 'claude'), providerScript('claude'), { mode: 0o755 });
    output = '';
    await setupHarnesses(project, { names: ['claude-code'], install: true, login: true, interactive: false, homePath: home, onOutput: text => output += text });
    assert.match(output, /authentication required.*claude auth login/);
    assert.doesNotMatch(output, /Installing/);
});
