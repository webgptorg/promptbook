import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { helpHint, renderHelp, resolveHelpRequest } from '../dist/coder/help.js';
import { installedEngineVersion } from '../dist/coder/version.js';

/** Run the real executable from an external, uninitialized fixture. */
const execute = promisify(execFile);
/** Installed binary path, independent of the temporary project directory. */
const executable = fileURLToPath(new URL('../bin/ptbk.js', import.meta.url));
/** Remove emphasis and wrapping to compare the help document's complete meaning. */
const unwrapped = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\n/g, '');
/** Compare facts even when narrow layouts wrap at their whitespace. */
const compact = text => unwrapped(text).replace(/\s/g, '').toLowerCase();

test('help resolution recognizes equivalent scopes before operation-specific validation', () => {
    for (const command of ['init', 'initialize', 'start', 'dashboard', 'add', 'recover', 'answer', 'run', 'server', 'fix', 'plan', 'verify', 'migrate', 'stop', 'restart', 'status', 'show', 'list', 'about', 'ping', 'generate-boilerplates', 'find-unwritten', 'find-refactor-candidates', 'find-fresh-emoji-tags']) {
        for (const argv of [[command, '--help'], [command, 'help'], ['help', command]]) {
            assert.deepEqual(resolveHelpRequest(argv), { path: [command], raw: false }, argv.join(' '));
        }
    }
    for (const argv of [[], ['help'], ['--help'], ['--'], ['--path', '/missing/project']]) {
        assert.deepEqual(resolveHelpRequest(argv), { path: [], raw: false });
    }
    assert.deepEqual(resolveHelpRequest(['--path', 'help', 'init', '--help']), { path: ['init'], raw: false });
    assert.deepEqual(resolveHelpRequest(['init', '--intent', 'help', '--help']), { path: ['init'], raw: false });
    assert.deepEqual(resolveHelpRequest(['init', '--installation', '--help']), { path: ['init'], raw: false });
    assert.deepEqual(resolveHelpRequest(['recover', 'TASK_ID', '--help']), { path: ['recover'], raw: false });
    assert.deepEqual(resolveHelpRequest(['add', 'A task description', '--help']), { path: ['add'], raw: false });
    assert.deepEqual(resolveHelpRequest(['help', 'help']), { path: ['help'], raw: false });
    assert.equal(resolveHelpRequest(['add', '--', 'help']), undefined);
    assert.equal(resolveHelpRequest(['init', '--intent', 'help']), undefined);
    assert.equal(resolveHelpRequest(['--version']), undefined);
    assert.equal(resolveHelpRequest(['--typo']), undefined);
    assert.equal(resolveHelpRequest(['--path']), undefined);
    assert.equal(resolveHelpRequest(['run', '--help=false']), undefined);
});

test('invalid scopes and input policy contradictions produce scoped unsuccessful help', () => {
    const presentation = { version: 'fixture-actual-version', pretty: false, color: false, width: 80 };
    for (const argv of [['help', 'start', 'unknown'], ['start', 'unknown', 'help'], ['start', 'unknown', '--help'], ['help', 'recover', 'resume'], ['help', 'does-not-exist']]) {
        const request = resolveHelpRequest(argv);
        assert.match(request.error, /Unknown help command path/);
        const result = renderHelp(request, presentation);
        assert.equal(result.exitCode, 2);
        assert.match(unwrapped(result.text), /Unknown help command path/);
        assert.doesNotMatch(result.text, /Command groups/);
    }
    const injected = renderHelp(resolveHelpRequest(['help', '\x1b[31munknown\x1b[0m\n']), presentation);
    assert.doesNotMatch(injected.text, /\x1b/);
    for (const args of [['--raw'], ['--no-ui'], ['--non-interactive'], ['--no-questions']]) {
        assert.match(resolveHelpRequest(['init', '--help', '--interactive', ...args]).error, /conflicts/);
    }
    assert.deepEqual(resolveHelpRequest(['start', '--help', '--interactive']), { path: ['start'], raw: false });
    assert.equal(helpHint(['init', '--installation']), 'Use ptbk init --help.');
    assert.equal(helpHint(['recover', 'TASK_ID', '--typo']), 'Use ptbk recover --help.');
    assert.equal(helpHint(['help', 'start', 'unknown']), 'Use ptbk start --help.');
    assert.equal(helpHint(['unknown']), 'Use ptbk --help.');
    const unsupported = renderHelp(resolveHelpRequest(['start', '--help', '--typo']), presentation);
    assert.equal(unsupported.exitCode, 2);
    assert.match(unsupported.text, /Unsupported option --typo/);
    assert.match(unsupported.text, /Use ptbk start --help/);
});

test('command references contain only applicable syntax, defaults and examples', () => {
    const presentation = { version: 'invoked-installation-123', pretty: false, color: false, width: 1000 };
    const help = command => unwrapped(renderHelp(resolveHelpRequest(['help', command]), presentation).text);
    const init = help('init');
    assert.match(init, /Usage: ptbk init \[options\]/);
    assert.match(init, /--installation local\|global/);
    assert.match(init, /exact running engine version locally/);
    assert.match(init, /Featured harnesses: OpenAI Codex, Claude Code/);
    assert.doesNotMatch(init, /--foreground|--limit|opencode|qwen-code|Command groups/);
    const start = help('start');
    assert.match(start, /Usage: ptbk start \[options\]/);
    assert.match(start, /--daemon/);
    assert.match(start, /--foreground/);
    assert.match(start, /default: first free port from 3000/);
    assert.match(start, /default: 10m/);
    assert.match(start, /require restart/);
    assert.doesNotMatch(start, /--installation|--template|--intent|--limit|--no-commit/);
    const restart = help('restart');
    assert.doesNotMatch(restart, /--foreground|--dry-run/);
    const add = help('add');
    assert.match(add, /--priority N\s+Priority of the new task; default: 0/);
    assert.match(add, /Cancellation creates no task/);
    assert.doesNotMatch(add, /--harness|--foreground|--min-priority/);
    const answer = help('answer');
    assert.match(answer, /--action answered\|rejected\|cancelled/);
    assert.doesNotMatch(answer, /--action resume\|retry\|acknowledge/);
    const recover = help('recover');
    assert.match(recover, /--action resume\|retry\|acknowledge/);
    assert.match(recover, /not subcommands/);
    const alias = help('initialize');
    assert.match(alias, /Usage: ptbk initialize \[options\]/);
    assert.match(alias, /--installation local\|global/);
    for (const text of [init, start, add, answer, recover, alias]) assert.match(text, /invoked-installation-123/);
});

test('pretty, color-suppressed and narrow raw help retain all scoped information', () => {
    const request = resolveHelpRequest(['help', 'init']);
    const base = { version: 'different-runtime-987', pretty: false, color: false, width: 1000 };
    const expected = renderHelp(request, base).text;
    const facts = ['--installation local|global', '--nested-strategy back|ignored|submodule', '--self-update', 'local uses this running version', 'before project setup', 'ptbk init --intent "Build a small project tracker"'];
    for (const fact of facts) assert.ok(compact(expected).includes(compact(fact)), `Baseline includes ${fact}`);
    for (const presentation of [{ ...base, pretty: true, color: true, width: 80 }, { ...base, pretty: true, color: false, width: 24 }, { ...base, width: 12 }]) {
        const output = renderHelp(request, presentation).text;
        const flattened = unwrapped(output);
        assert.match(flattened, /different-runtime-987/);
        for (const fact of facts) assert.ok(compact(output).includes(compact(fact)), fact);
        if (!presentation.color) assert.doesNotMatch(output, /\x1b/);
        assert.doesNotMatch(output, /\x1b\[\?(?:1049|1000|2004)|\x1b\[2J/);
    }
    const forcedRaw = renderHelp(resolveHelpRequest(['help', 'init', '--raw']), { ...base, pretty: true, color: true });
    assert.doesNotMatch(forcedRaw.text, /\x1b|─/);
});

test('real CLI help forms stay offline and read-only despite missing inputs and invalid project settings', async t => {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk scoped help '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    await writeFile(join(directory, 'ptbk.json'), 'not valid JSON; commands must not load it for help');
    const invoke = argv => execute(process.execPath, [executable, ...argv], { cwd: directory, timeout: 5_000 });
    const actualVersion = await installedEngineVersion();
    const top = [];
    for (const args of [[], ['help'], ['--help'], ['--']]) {
        const { stdout, stderr } = await invoke(args);
        assert.equal(stderr, '');
        assert.ok(unwrapped(stdout).includes(`Promptbook ${actualVersion}`));
        assert.match(stdout, /Command groups/);
        assert.doesNotMatch(stdout, /\x1b/);
        top.push(stdout);
    }
    for (const output of top) assert.equal(output, top[0]);
    for (const command of ['init', 'initialize', 'start', 'dashboard', 'add', 'recover', 'answer', 'run', 'server', 'fix', 'plan', 'verify', 'migrate', 'stop', 'restart', 'status', 'show', 'list', 'about', 'ping', 'generate-boilerplates', 'find-unwritten', 'find-refactor-candidates', 'find-fresh-emoji-tags']) {
        const outputs = [];
        for (const args of [[command, '--help'], [command, 'help'], ['help', command]]) {
            const { stdout, stderr } = await invoke(args);
            assert.equal(stderr, '');
            assert.ok(unwrapped(stdout).includes(`Usage: ptbk ${command}`), command);
            assert.ok(unwrapped(stdout).includes(`Promptbook ${actualVersion}`));
            assert.doesNotMatch(stdout, /Command groups|\x1b/);
            outputs.push(stdout);
        }
        assert.equal(outputs[0], outputs[1]); assert.equal(outputs[1], outputs[2]);
    }
    for (const argv of [['help', 'start', 'unknown'], ['recover', 'resume', 'help'], ['unknown', '--help']]) {
        await assert.rejects(invoke(argv), error => {
            assert.equal(error.code, 2);
            assert.match(unwrapped(error.stdout + error.stderr), /Unknown help command path/);
            assert.doesNotMatch(error.stdout + error.stderr, /Command groups/);
            return true;
        });
    }
    for (const argv of [['--json'], ['--limit', '1']]) {
        await assert.rejects(invoke(argv), error => {
            assert.equal(error.code, 2);
            assert.ok(error.stderr.includes(argv[0]));
            assert.doesNotMatch(error.stderr, /Invalid project configuration|not valid JSON|JSON\.parse|Unexpected token/);
            assert.match(error.stderr, /help/);
            return true;
        });
    }
    for (const command of ['start', 'restart']) {
        await assert.rejects(invoke([command, '--dry-run', '--path', directory]), error => {
            assert.equal(error.code, 2);
            assert.match(error.stderr, /--dry-run/);
            assert.doesNotMatch(error.stderr, /Invalid project configuration|not valid JSON|JSON\.parse|Unexpected token/);
            assert.match(error.stderr, /help/);
            return true;
        });
    }
    assert.deepEqual(await readdir(directory), ['ptbk.json']);
});
