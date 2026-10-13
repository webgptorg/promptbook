import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { terminalServiceQr } from '../dist/coder/cli.js';

/** Each synthetic TTY runs in its own process, keeping host streams and signals untouched. */
const execute = promisify(execFile);
/** Load the same installed CLI entry point as the executable. */
const cliModule = new URL('../dist/coder/cli.js', import.meta.url).href;

/** Invoke the real CLI with output and input capabilities controlled independently of the host. */
async function ttyCli(directory, args, keys, extraEnv = {}) {
    const script = `
        import { EventEmitter } from 'node:events';
        import { main } from ${JSON.stringify(cliModule)};
        const saved = process.stdout;
        const input = new EventEmitter();
        let resumed = 0;
        Object.assign(input, { isTTY:true, isRaw:false, setRawMode(value){this.isRaw=value}, resume(){resumed++}, pause(){} });
        const output = new EventEmitter();
        let stdout = ''; let stderr = ''; let selected = false;
        const keys = JSON.parse(process.argv[2]);
        Object.assign(output, { isTTY:true, columns:100, rows:24, write(chunk){
            stdout += String(chunk);
            if (!selected && keys !== null && String(chunk).includes('Review the task before saving')) {
                selected = true; setImmediate(() => input.emit('data', keys));
            }
            return true;
        }});
        const errorOutput = new EventEmitter();
        Object.assign(errorOutput, { isTTY:true, columns:100, rows:24, write(chunk){stderr += String(chunk);return true;} });
        Object.defineProperty(process,'stdin',{value:input,configurable:true});
        Object.defineProperty(process,'stdout',{value:output,configurable:true});
        Object.defineProperty(process,'stderr',{value:errorOutput,configurable:true});
        const code = await main(JSON.parse(process.argv[1]));
        saved.write(JSON.stringify({code,stdout,stderr,resumed,raw:input.isRaw,selected}));
    `;
    const result = await execute(process.execPath, ['--input-type=module', '--eval', script, JSON.stringify(args), JSON.stringify(keys)], {
        cwd: directory, timeout: 15_000, env: { ...process.env, TERM: 'xterm-256color', NO_COLOR: '', ...extraEnv },
    });
    return JSON.parse(result.stdout);
}

/** A committed authoring project isolates saved execution bounds from new task priority. */
async function project(t) {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk rich cli '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    await execute('git', ['init', '-q'], { cwd: directory });
    await execute('git', ['config', 'user.name', 'Fixture'], { cwd: directory });
    await execute('git', ['config', 'user.email', 'fixture@example.test'], { cwd: directory });
    await execute('git', ['config', 'commit.gpgsign', 'false'], { cwd: directory });
    await mkdir(join(directory, 'tasks', 'templates'), { recursive: true });
    await writeFile(join(directory, 'tasks', 'templates', 'sample.book'), 'TASK Template\n{{description}}\nAcceptance criteria remain visible.\n');
    await writeFile(join(directory, 'ptbk.json'), JSON.stringify({ execution: { minPriority: 5, maxPriority: 7 } }));
    await writeFile(join(directory, '.gitignore'), '.ptbk/\n');
    await execute('git', ['add', '.'], { cwd: directory });
    await execute('git', ['commit', '-qm', 'Authoring baseline'], { cwd: directory });
    return directory;
}

test('CLI add confirms supplied inputs in a rich wizard without conflating task and queue priority', async t => {
    const directory = await project(t);
    const result = await ttyCli(directory, ['add', 'Reviewed CLI task', '--priority', '17', '--template', 'tasks/templates/sample.book'], '\u001b[H\r');
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.selected, true);
    assert.match(result.stdout, /Task saved/);
    assert.match(result.stdout, /┌/);
    const tasks = (await readdir(join(directory, 'tasks'))).filter(name => name.endsWith('.book'));
    assert.equal(tasks.length, 1);
    assert.match(await readFile(join(directory, 'tasks', tasks[0]), 'utf8'), /TASK PRIORITY 17/);
});

test('CLI wizard cancellation creates no task or runtime state', async t => {
    const directory = await project(t);
    const result = await ttyCli(directory, ['add', 'Unsaved CLI task', '--priority', '0', '--template', 'tasks/templates/sample.book'], '\r');
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /No task was created/);
    assert.deepEqual(await readdir(join(directory, 'tasks')), ['templates']);
    assert(!(await readdir(directory)).includes('.ptbk'));
    assert.equal(result.raw, false);
});

test('raw, disabled interaction and unsuitable terminals never open hidden task editors', async t => {
    const directory = await project(t);
    for (const [args, env] of [
        [['add', '--raw'], {}],
        [['add', '--interactive=false'], {}],
        [['add'], { TERM: 'dumb' }],
        [['add', '--interactive'], { TERM: 'dumb' }],
    ]) {
        const result = await ttyCli(directory, args, null, env);
        assert.equal(result.code, 2, result.stderr);
        assert.equal(result.resumed, 0);
        assert.doesNotMatch(result.stdout, /\u001b/);
    }
    assert.deepEqual(await readdir(join(directory, 'tasks')), ['templates']);
    assert(!(await readdir(directory)).includes('.ptbk'));
});

test('raw informational commands remain plain on otherwise capable terminals', async t => {
    const directory = await project(t);
    for (const command of ['about', 'status', 'show', 'list']) {
        const result = await ttyCli(directory, [command, '--raw'], null);
        assert.equal(result.code, 0, result.stderr);
        assert.equal(result.resumed, 0);
        assert.doesNotMatch(result.stdout, /\u001b|[┌┐└┘│]/);
    }
});

test('startup QR follows raw, suppressed-color and narrow-terminal presentation', async () => {
    const url = 'http://127.0.0.1:3000/#fixture-private-session';
    assert.equal(await terminalServiceQr(url, { pretty: false, color: false, width: 100 }), '');
    const monochrome = await terminalServiceQr(url, { pretty: true, color: false, width: 100 });
    assert.match(monochrome, /[█▀▄]/);
    assert.doesNotMatch(monochrome, /\u001b/);
    for (const line of monochrome.split('\n')) assert(line.length < 100);
    const narrow = await terminalServiceQr(url, { pretty: true, color: true, width: 20 });
    assert.match(narrow, /terminal is too narrow/);
    assert.doesNotMatch(narrow, /\u001b|[█▀▄]/);
});
