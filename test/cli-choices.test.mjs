import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

/** Run each interactive CLI fixture in an isolated process with synthetic terminal streams. */
const execute = promisify(execFile);
/** Resolve the same built CLI module loaded by the executable. */
const cliModule = new URL('../dist/coder/cli.js', import.meta.url).href;
/** Resolve display order from the actual plugin registry rather than hard-coding provider positions. */
const harnessModule = new URL('../dist/coder/harness.js', import.meta.url).href;
/** Resolve durable request fixtures from this installation. */
const requestsModule = new URL('../dist/coder/requests.js', import.meta.url).href;
/** Resolve project boundaries without preparing or initializing a destination. */
const workspaceModule = new URL('../dist/coder/workspace.js', import.meta.url).href;

/** Drive setup or a durable answer using keyboard choices in an isolated terminal. */
async function cliChoices(directory, scenario) {
    const driver = `
        import { EventEmitter } from 'node:events';
        import { main } from ${JSON.stringify(cliModule)};
        import { HARNESS_REGISTRY } from ${JSON.stringify(harnessModule)};
        import { createRequest, listRequests } from ${JSON.stringify(requestsModule)};
        import { resolveWorkspace } from ${JSON.stringify(workspaceModule)};
        const realOutput = process.stdout;
        const input = new EventEmitter();
        Object.assign(input, { isTTY: true, isRaw: false, setRawMode(value) { this.isRaw = value; }, resume() {}, pause() {} });
        const output = new EventEmitter();
        const screens = [];
        let phase = 0;
        const scenario = process.argv[1];
        const expandedSelection = HARNESS_REGISTRY.findIndex(entry => entry.name === 'gemini');
        Object.assign(output, {
            isTTY: true, rows: 24, columns: 100,
            write(chunk) {
                const screen = String(chunk);
                screens.push(screen);
                let keys;
                if (scenario === 'destination') {
                    if (phase === 0 && screen.includes('Choose the project destination')) { phase++; keys = '\\x1b[B\\r'; }
                    else if (phase === 1 && screen.includes('New subfolder path')) { phase++; keys = '\\x03'; }
                } else if (scenario === 'harnesses') {
                    if (phase === 0 && screen.includes('Select harnesses')) { phase++; keys = ' \\x1b[F\\r'; }
                    else if (phase === 1 && screen.includes('GitHub Copilot')) { phase++; keys = '\\x1b[H' + '\\x1b[B'.repeat(expandedSelection) + ' \\x1b[F\\r'; }
                    else if (phase === 2 && screen.includes('More harnesses') && screen.includes('Gemini')) { phase++; keys = '\\x1b[H\\r'; }
                    else if (phase === 3 && screen.includes('Project browser visibility')) { phase++; keys = '\\x03'; }
                } else if (phase === 0 && screen.includes('How should this run continue?')) {
                    phase++; keys = '\\x1b[B\\r';
                }
                if (keys) setImmediate(() => input.emit('data', keys));
                return true;
            },
        });
        Object.defineProperty(process, 'stdin', { value: input, configurable: true });
        Object.defineProperty(process, 'stdout', { value: output, configurable: true });
        const workspace = scenario === 'answer' ? await resolveWorkspace({ path: process.cwd() }) : undefined;
        const request = workspace ? await createRequest(workspace, {
            kind: 'question', reason: 'Choose the next action.', prompt: 'How should this run continue?',
            choices: ['Keep current settings', 'Apply new settings'],
        }) : undefined;
        const args = scenario === 'answer' ? ['answer', request.id, '--path', process.cwd()] : scenario === 'destination'
            ? ['init', '--no-self-update', '--no-install']
            : ['init', '--path', process.cwd(), '--intent', '', '--no-self-update', '--installation', 'global'];
        const exitCode = await main(args);
        const answered = workspace ? (await listRequests(workspace)).find(item => item.id === request.id) : undefined;
        realOutput.write(JSON.stringify({ exitCode, phase, screens, raw: input.isRaw, answered }));
    `;
    const result = await execute(process.execPath, ['--input-type=module', '--eval', driver, scenario], { cwd: directory, timeout: 10_000 });
    return JSON.parse(result.stdout);
}

test('setup destination uses arrows and Enter without requiring a typed choice', async t => {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk destination choice '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const result = await cliChoices(directory, 'destination');
    assert.equal(result.phase, 2, 'Selecting New subfolder opens the freeform path editor');
    assert.equal(result.exitCode, 130);
    assert.equal(result.raw, false);
    assert.match(result.screens.join(''), /Current directory/);
    assert.match(result.screens.join(''), /New subfolder/);
    assert.deepEqual(await readdir(directory), []);
});

test('setup harness checkboxes retain selections through More and featured navigation', async t => {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk harness choices '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const result = await cliChoices(directory, 'harnesses');
    assert.equal(result.phase, 4, 'Checkbox selection submits to the browser visibility picker');
    assert.equal(result.exitCode, 130);
    assert.equal(result.raw, false);
    const retained = result.screens.find(screen => screen.includes('More harnesses') && screen.includes('Gemini'));
    assert.ok(retained, 'A selected integration remains reachable in the featured catalog');
    assert.match(retained, /\[x\] OpenAI Codex/);
    assert.match(retained, /\[x\] Gemini/);
    assert.doesNotMatch(result.screens.join(''), /Comma-separated identifiers/);
    assert.deepEqual(await readdir(directory), []);
});

test('interactive CLI answers predefined request choices using arrows and Enter', async t => {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk answer choices '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const result = await cliChoices(directory, 'answer');
    assert.equal(result.phase, 1);
    assert.equal(result.exitCode, 0);
    assert.equal(result.raw, false);
    assert.equal(result.answered.status, 'answered');
    assert.equal(result.answered.response, 'Apply new settings');
    assert.doesNotMatch(result.screens.join(''), /Enter newline/);
});
