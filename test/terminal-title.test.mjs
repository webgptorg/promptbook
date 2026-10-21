import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dashboardTitle } from '../dist/ui/dashboard.js';
import { createTerminalProfile } from '../dist/ui/terminal.js';
import { formatTerminalTitle, isTerminalTitleDisabled, sanitizeTitleText, TerminalTitle, titleSequence } from '../dist/ui/terminal-title.js';
import { ptbk, temporaryDirectory } from './helpers.mjs';

/**
 * Collects everything a title controller writes.
 */
function recorder(enabled = true, unicode = true) {
    const writes = [];
    const title = new TerminalTitle({ enabled, unicode, write: (text) => writes.push(text) });
    return { title, writes };
}

/**
 * A fake terminal stream (TTY or redirected).
 */
function stream(isTTY) {
    const writes = [];
    return { isTTY, columns: 100, rows: 30, hasColors: () => true, write: (text) => writes.push(text), writes };
}

/**
 * A minimal shared status snapshot for title derivation.
 */
function snapshot(change = {}) {
    return {
        project: { name: 'birds', path: '/work/birds' },
        service: { mode: 'daemon', state: 'running' },
        phase: 'idle',
        chats: { waiting: [] },
        ...change,
    };
}

test('the title names Promptbook with a symbol, then project, mode and detail', () => {
    assert.equal(formatTerminalTitle({ project: 'birds', mode: 'Dashboard', detail: 'Expert: Write the README' }), '📖 Promptbook · birds · Dashboard · Expert: Write the README');
    assert.equal(formatTerminalTitle({ mode: 'All engines' }), '📖 Promptbook · All engines');
    assert.equal(formatTerminalTitle({ project: 'birds', mode: 'Init' }, false), 'Promptbook - birds - Init', 'ASCII form without safe Unicode');
    assert.equal(titleSequence('📖 Promptbook · birds'), '\x1b]0;📖 Promptbook · birds\x07', 'standard OSC 0 title control');
});

test('untrusted names cannot inject terminal controls or multiline titles and are capped', () => {
    const hostile = 'Evil\x07\x1b]0;pwned\x07\x1b[2J\u009b31m task\r\nsecond\u2028line\u202ereversed\ttab';
    const clean = sanitizeTitleText(hostile);
    assert.doesNotMatch(clean, /[\x00-\x1f\x7f-\x9f\u202e]/, 'no ESC, BEL, C1 or bidi controls survive');
    assert.equal(clean, 'Evil task second linereversed tab', 'whole control sequences are removed, line breaks and tabs become spaces');
    const long = formatTerminalTitle({ project: 'p'.repeat(200), mode: 'Dashboard', detail: `${'very long task title '.repeat(20)}\n` });
    assert.ok([...long].length <= 96, `capped: ${long}`);
    assert.match(long, /…/);
    assert.doesNotMatch(long, /\n/);
    const sequence = titleSequence(formatTerminalTitle({ project: 'x\x07\x1b\\y', mode: 'Chat', detail: '\x1b]2;fake\x1b\\' }));
    assert.equal(sequence.match(/\x1b/g).length, 1, 'only the title control itself starts with ESC');
    assert.equal(sequence.match(/\x07/g).length, 1, 'only the title control itself ends with BEL');
});

test('titles are written only on change, saved before the first change and restored on exit where supported', () => {
    const { title, writes } = recorder();
    title.set({ project: 'birds', mode: 'Dashboard' });
    assert.deepEqual(writes, ['\x1b[22;0t\x1b]0;📖 Promptbook · birds · Dashboard\x07'], 'the previous title is pushed once, then ours is set');
    title.set({ project: 'birds', mode: 'Dashboard' });
    title.update({ mode: 'Dashboard' });
    assert.equal(writes.length, 1, 'repeated renders do not rewrite the title');
    title.update({ mode: 'Chat', detail: 'Question about feeders' });
    assert.equal(writes.at(-1), '\x1b]0;📖 Promptbook · birds · Chat · Question about feeders\x07', 'update keeps the project');
    title.invalidate();
    title.update({ mode: 'Chat', detail: 'Question about feeders' });
    assert.equal(writes.length, 3, 'after another process may have changed it, the title is written again');
    title.restore();
    assert.equal(writes.at(-1), '\x1b[23;0t', 'the saved title is popped');
    title.restore();
    assert.equal(writes.length, 4, 'restoring twice writes nothing');
});

test('a disabled controller never writes anything', () => {
    const { title, writes } = recorder(false);
    title.set({ project: 'birds', mode: 'Init' });
    title.update({ mode: 'Dashboard' });
    title.restore();
    assert.deepEqual(writes, []);
    assert.equal(title.current, undefined);
});

test('titles are enabled only for interactive pretty terminals and can be switched off', () => {
    const tty = () => ({ stdout: stream(true), stdin: { isTTY: true }, env: { TERM: 'xterm-256color' } });
    assert.equal(createTerminalProfile(tty()).title.enabled, true);
    assert.equal(createTerminalProfile({ ...tty(), stdout: stream(false) }).title.enabled, false, 'redirected output');
    assert.equal(createTerminalProfile({ ...tty(), stdin: { isTTY: false } }).title.enabled, false, 'no keyboard: noninteractive use');
    assert.equal(createTerminalProfile({ ...tty(), raw: true }).title.enabled, false, '--raw');
    assert.equal(createTerminalProfile({ ...tty(), nonInteractive: true }).title.enabled, false, '--non-interactive');
    assert.equal(createTerminalProfile({ ...tty(), env: { TERM: 'dumb' } }).title.enabled, false, 'dumb terminal');
    assert.equal(createTerminalProfile({ ...tty(), terminalTitle: false }).title.enabled, false, '--no-terminal-title');
    assert.equal(createTerminalProfile({ ...tty(), env: { TERM: 'xterm', PTBK_TERMINAL_TITLE: 'off' } }).title.enabled, false, 'PTBK_TERMINAL_TITLE=off');

    assert.equal(isTerminalTitleDisabled({ PTBK_TERMINAL_TITLE: '0' }), true);
    assert.equal(isTerminalTitleDisabled({ DISABLE_AUTO_TITLE: 'true' }), true, "the user's shell manages titles itself");
    assert.equal(isTerminalTitleDisabled({ DISABLE_AUTO_TITLE: 'true', PTBK_TERMINAL_TITLE: 'on' }), false, 'explicit opt-in wins');
    assert.equal(isTerminalTitleDisabled({ DISABLE_AUTO_TITLE: 'false' }), false);
    assert.equal(isTerminalTitleDisabled({}), false);

    const profile = createTerminalProfile({ ...tty(), stdout: stream(false) });
    profile.title.set({ project: 'birds', mode: 'Init' });
    assert.equal(profile.title.current, undefined, 'nothing is emitted into redirected output');
});

test('project views name the mode and change the title on task start, task switch and state changes', () => {
    const current = (agent, taskTitle) => ({ current: { agent: { name: agent }, taskTitle }, phase: 'executing' });
    assert.deepEqual(dashboardTitle(snapshot(), false), { project: 'birds', mode: 'Dashboard', detail: undefined });
    assert.equal(dashboardTitle(snapshot(current('Expert', 'Write the README')), false).detail, 'Expert: Write the README');
    assert.equal(dashboardTitle(snapshot(current('Developer', 'Fix the feed')), false).detail, 'Developer: Fix the feed');
    assert.equal(dashboardTitle(snapshot({ service: { mode: 'daemon', state: 'pause' } }), false).detail, 'Paused');
    assert.equal(dashboardTitle(snapshot({ chats: { waiting: [{ name: 'Question' }] } }), false).detail, 'Needs you');
    assert.equal(dashboardTitle(snapshot({ tools: { waiting: { reason: 'no harness' } } }), false).detail, 'Waiting for tools');
    assert.equal(dashboardTitle(snapshot({ service: { mode: 'foreground', state: 'running' } }), true).mode, 'Foreground');
    assert.equal(dashboardTitle(snapshot({ service: { mode: 'run', state: 'running' } }), true).mode, 'Run');

    const { title, writes } = recorder();
    for (const view of [snapshot(), snapshot(), snapshot(current('Expert', 'Write the README')), snapshot(current('Expert', 'Write the README')), snapshot(current('Developer', 'Fix the feed'))]) title.set(dashboardTitle(view, false));
    assert.equal(writes.length, 3, 'one write per meaningful change, none per refresh');
});

test('redirected and machine-readable CLI output never contains title controls; the opt-out flag is accepted', async (t) => {
    const directory = await temporaryDirectory(t);
    for (const args of [['--help'], ['status'], ['status', '--json'], ['dashboard', '--no-terminal-title'], ['list', '--no-terminal-title', '--raw']]) {
        const result = await ptbk(args, { cwd: directory, env: { ...process.env, TERM: 'xterm-256color' } });
        assert.doesNotMatch(result.output, /\x1b\]|\x1b\[2[23];/, `no title control for ptbk ${args.join(' ')}`);
        assert.doesNotMatch(result.stderr, /Unknown option --no-terminal-title/);
    }
});
