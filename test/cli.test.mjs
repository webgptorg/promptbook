import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT, ptbk, temporaryDirectory } from './helpers.mjs';

const version = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')).version;

test('without a terminal, bare ptbk shows the same technical overview as ptbk help and ptbk --help, with the running version', async () => {
    const bare = await ptbk(['--raw']);
    const help = await ptbk(['help', '--raw']);
    const flag = await ptbk(['--help', '--raw']);
    assert.equal(bare.code, 0);
    assert.equal(bare.stdout, help.stdout);
    assert.equal(bare.stdout, flag.stdout);
    assert.match(bare.stdout, new RegExp(`ptbk ${version.replace(/\./g, '\\.')}`));
    assert.match(bare.stdout, /ptbk init/);
    assert.doesNotMatch(bare.stdout, /\x1b\[/, 'raw output has no escape sequences');
    assert.doesNotMatch(bare.stdout, /^\s*run\s/m, 'there is no finite run command');
    const redirected = await ptbk([]);
    assert.equal(redirected.code, 0);
    assert.match(redirected.stdout, /Ordinary workflow/, 'bare invocation without a terminal never prompts');
});

test('about is a compact product box (name, purpose, version, website, GitHub), not a command reference', async () => {
    const about = await ptbk(['about', '--raw']);
    assert.equal(about.code, 0);
    assert.match(about.stdout, /^Promptbook$/m);
    assert.match(about.stdout, /^You used to give AI tasks\. Now it works for you\.$/m, 'raw output keeps the shared authored product copy');
    assert.match(about.stdout, new RegExp(`^Engine: ptbk ${version.replace(/\./g, '\\.')}$`, 'm'));
    assert.match(about.stdout, /^Website: https:\/\/www\.ptbk\.io\/en$/m);
    assert.match(about.stdout, /^GitHub: https:\/\/github\.com\/webgptorg\/promptbook$/m);
    assert.doesNotMatch(about.stdout, /--path|--raw|Usage/, 'no dump of command options');
    assert.ok(about.stdout.trim().split('\n').length <= 20, about.stdout);
});

test('--version prints exactly the installed engine version', async () => {
    const result = await ptbk(['--version']);
    assert.equal(result.stdout.trim(), version);
});

test('scoped help forms are equivalent and only describe that command', async () => {
    const forms = [
        ['init', '--help', '--raw'],
        ['init', 'help', '--raw'],
        ['help', 'init', '--raw'],
        ['initialize', '--help', '--raw'],
    ];
    const outputs = await Promise.all(forms.map((args) => ptbk(args)));
    for (const output of outputs) assert.equal(output.code, 0);
    assert.equal(outputs[0].stdout, outputs[1].stdout);
    assert.equal(outputs[0].stdout, outputs[2].stdout);
    assert.match(outputs[0].stdout, /--installation/);
    assert.doesNotMatch(outputs[0].stdout, /--after-task/, 'stop options are not listed under init');
    const start = await ptbk(['start', '--help', '--raw']);
    assert.match(start.stdout, /--foreground/);
    assert.doesNotMatch(start.stdout, /--installation/);
    const nested = await ptbk(['help', 'access', 'pair', '--raw']);
    assert.match(nested.stdout, /ptbk access pair/);
    assert.match(nested.stdout, /--renew/);
});

test('unknown commands, paths and options fail with scoped guidance (never silently ignored)', async () => {
    const command = await ptbk(['strat', '--raw']);
    assert.equal(command.code, 2);
    assert.match(command.stderr, /Did you mean `start`/);
    const option = await ptbk(['list', '--colour', '--raw']);
    assert.equal(option.code, 2);
    assert.match(option.stderr, /Unknown option --colour for ptbk list/);
    assert.match(option.stderr, /ptbk list --help/);
    const path = await ptbk(['help', 'nope', '--raw']);
    assert.equal(path.code, 2);
});

test('contradictory options are diagnosed before any work', async (t) => {
    const directory = await temporaryDirectory(t);
    const cases = [
        [['start', '--daemon', '--foreground'], /mutually exclusive/],
        [['start', '--tunnel', '--no-server'], /conflicts with --no-server/],
        [['start', '--isolate', '--no-commit'], /--isolate requires commits/],
        [['start', '--no-commit', '--auto-push'], /conflicts with automatic synchronization/],
        [['start', '--no-commit', '--auto-sync'], /conflicts with automatic synchronization/],
        [['start', '--no-auto-sync', '--auto-pull'], /contradicts --auto-pull/],
        [['start', '--git-changes', 'continue', '--check-before', 'yes-and-fix'], /conflicts with --check-before/],
        [['run'], /ptbk run was removed[\s\S]*ptbk start/],
        [['start', '--limit', '1'], /Unknown option --limit/],
        [['start', '--raw', '--interactive'], /cannot be combined/],
    ];
    for (const [args, pattern] of cases) {
        const result = await ptbk([...args, '--path', directory, '--raw'].filter((value, index, all) => !(value === '--raw' && all.indexOf('--raw') !== index)), { cwd: directory });
        assert.equal(result.code, 2, `${args.join(' ')} → ${result.output}`);
        assert.match(result.stderr, pattern);
    }
    assert.deepEqual(await readdir(directory), [], 'nothing was created');
});

test('help, about and version never initialize or touch a project', async (t) => {
    const directory = await temporaryDirectory(t);
    for (const args of [['--raw'], ['about', '--raw'], ['start', '--help'], ['init', 'help'], ['--version']]) {
        const result = await ptbk(args, { cwd: directory });
        assert.equal(result.code, 0, result.output);
    }
    assert.deepEqual(await readdir(directory), []);
});
