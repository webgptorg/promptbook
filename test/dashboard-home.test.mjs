import assert from 'node:assert/strict';
import { test } from 'node:test';
import { homeLayout, homeTiles, renderHome, renderPage, tileAttention } from '../dist/ui/dashboard-home.js';
import { keepSelection, pageBody, pageForTile } from '../dist/ui/dashboard-pages.js';
import { stringWidth, stripAnsi } from '../dist/ui/ansi.js';
import { createTerminalProfile } from '../dist/ui/terminal.js';

/**
 * A terminal profile of a given size (pretty, interactive, colorless so text can be compared).
 */
function terminal(columns, rows, change = {}) {
    const stdout = { isTTY: true, columns, rows, hasColors: () => false, write: () => true };
    const profile = createTerminalProfile({ stdout, stdin: { isTTY: true }, env: { TERM: 'xterm-256color', NO_COLOR: '1' } });
    return { ...profile, columns: () => columns, rows: () => rows, ...change };
}

/**
 * A representative snapshot with long identifiers, URLs and work in progress.
 */
function snapshot(change = {}) {
    return {
        revision: 4,
        observedAt: new Date().toISOString(),
        project: { name: 'birds', path: `/home/${'very-long-directory/'.repeat(8)}birds` },
        engine: { version: '0.119.0-33', installation: '/usr/lib/node_modules/ptbk', scope: 'global' },
        service: { mode: 'daemon', state: 'running', pid: 4242, instanceId: 'abcdef123456', startedAt: new Date().toISOString(), persistent: true, commitMode: 'commit', stopRequested: false, lifecycle: { revision: 1, draining: false, shutdown: false, cancellable: false, restartable: true }, pauseReasons: [] },
        phase: 'executing',
        current: { taskRef: 'tasks/x.book', taskTitle: `Write ${'a very long task title '.repeat(10)}`, kind: 'task', agent: { name: 'Developer', key: 'developer', activity: 'working', face: '', gesture: '', hue: 0 }, harness: 'openai-codex', harnessName: 'OpenAI Codex', modelSource: 'default', phase: 'executing', attempt: 1, attemptBudget: 3, startedAt: new Date().toISOString() },
        health: { status: 'ok', summary: 'System OK', intervalMs: 30000, limits: { disk: 500, memory: 512, source: 'engine defaults' }, disk: { freeMiB: 20000, paths: [] }, memory: { availableMiB: 8000 }, cpu: { cores: 8, load1: 1, state: 'normal' }, network: { state: 'reachable' }, incidents: [], remediation: { cache: { path: '.ptbk/tmp' }, swap: { supported: false, note: '' } } },
        tools: { items: [{ name: 'codex', type: 'HARNESS', variant: 'OPENAI_CODEX', variantLabel: 'OpenAI Codex', order: 1, isEnabled: true, state: 'usable', summary: 'Ready', inUse: true, fields: {} }], problems: [] },
        queue: [{ ref: 'a', title: 'Next', readiness: 'ready', reason: 'Ready', priority: 0, source: 'tasks/a.book' }],
        queueTotal: 1,
        results: { completed: 2, failed: 0, recent: [] },
        chats: { waiting: [], unread: 0, total: 0, recent: [] },
        blockers: [],
        errors: [],
        activity: Array.from({ length: 80 }, (_, index) => ({ at: new Date().toISOString(), text: `activity line ${index}`, level: 'info' })),
        agents: [{ name: 'Developer', key: 'developer', activity: 'working', face: '', gesture: '', hue: 0 }, { name: 'Expert', key: 'expert', activity: 'idle', face: '', gesture: '', hue: 0, role: 'engine' }],
        harnesses: [],
        settings: [],
        connection: { local: { state: 'ready', url: 'http://127.0.0.1:3000/' }, remote: { state: 'ready', url: `https://${'x'.repeat(120)}.trycloudflare.com/`, provider: 'cloudflare-quick' } },
        ...change,
    };
}

const view = (change = {}) => ({ focus: 'work', attention: new Map(), frame: 0, legend: ' Q leave', ...change });

test('the home screen fits standard, narrowed and fullscreen terminals completely, without scrolling', () => {
    for (const [columns, rows] of [[120, 30], [80, 24], [100, 25], [60, 18], [200, 50], [140, 40], [50, 14]]) {
        const lines = renderHome(snapshot(), terminal(columns, rows), view());
        assert.equal(lines.length, rows, `${columns}x${rows}: exactly the surface height`);
        for (const line of lines) assert.ok(stringWidth(line) <= columns, `${columns}x${rows}: no line wider than the terminal`);
        const text = lines.map(stripAnsi).join('\n');
        for (const title of ['Current work', 'System', 'Health', 'Chats', 'Tasks', 'Agents', 'Tools', 'Results', 'Connection']) assert.match(text, new RegExp(title), `${columns}x${rows}: ${title} is visible`);
        assert.match(stripAnsi(lines[0]), /^━━ {2}Promptbook · PTBK {2}━━ birds ━━ ● running .*━━$/, `${columns}x${rows}: the shared Promptbook/PTBK, project and state header spans the top`);
        assert.equal(stringWidth(lines[0]), columns, `${columns}x${rows}: the header band fills the width`);
        assert.doesNotMatch(stripAnsi(lines[0]), /[╭╮│]/, `${columns}x${rows}: the header is not another bordered tile`);
        if (homeLayout(homeTiles(snapshot()), columns, rows).kind === 'grid') assert.match(stripAnsi(lines[1]), /^╭/, `${columns}x${rows}: the tile grid starts right below the header`);
        assert.doesNotMatch(text, /0\.119\.0-33|very-long-directory|trycloudflare/, 'version, path and URLs live on pages, not on the root');
    }
    assert.equal(homeLayout(homeTiles(snapshot()), 120, 30).kind, 'grid');
    assert.ok(homeLayout(homeTiles(snapshot()), 200, 50).rows[0].length > homeLayout(homeTiles(snapshot()), 80, 24).rows[0].length, 'wider surfaces use more columns');
    assert.equal(homeLayout(homeTiles(snapshot()), 70, 13).kind, 'list', 'short surfaces fall back to one line per tile');
    assert.equal(homeLayout(homeTiles(snapshot()), 25, 6).kind, 'tiny');
    assert.match(stripAnsi(renderHome(snapshot(), terminal(25, 6), view()).join('\n')), /too\s+small/);
    assert.ok(!homeTiles(snapshot()).includes('sync') && homeTiles(snapshot({ sync: { phase: 'idle', state: 'synchronized' } })).includes('sync'), 'Synchronization exists only while autosync is enabled');
});

test('attention is independent from focus and distinguishable from it; reduced motion keeps the meaning', () => {
    const waiting = snapshot({ chats: { waiting: [{ name: 'Question', messages: 2, agent: 'Developer', awaiting: { sender: 'Developer', text: 'Which feeder?' }, links: [] }], unread: 1, total: 1, recent: [] } });
    const first = tileAttention(waiting, 'chats');
    assert.equal(first.tone, 'warning');
    const more = tileAttention({ ...waiting, chats: { ...waiting.chats, waiting: [{ ...waiting.chats.waiting[0], messages: 3 }] } }, 'chats');
    assert.notEqual(more.key, first.key, 'a new message is a new attention event');
    assert.equal(tileAttention(snapshot(), 'chats'), undefined);

    const lines = renderHome(waiting, terminal(120, 30), view({ attention: new Map([['chats', 'new']]) })).map(stripAnsi).join('\n');
    assert.match(lines, /❯ Current work/, 'focus stays where the operator left it');
    assert.match(lines, /▲ Chats/, 'the attention tile is marked');
    assert.doesNotMatch(lines, /❯ ▲ Chats/);
    assert.match(lines, /1 needs attention/);
    const both = renderHome(waiting, terminal(120, 30), view({ focus: 'chats', attention: new Map([['chats', 'seen']]) })).map(stripAnsi).join('\n');
    assert.match(both, /❯ ▲ Chats/, 'focus and attention are both visible on one tile');
    const reduced = renderHome(waiting, terminal(120, 30, { reducedMotion: true }), view({ attention: new Map([['chats', 'new']]) })).map(stripAnsi).join('\n');
    assert.match(reduced, /▲ Chats NEW/, 'without animation, unseen attention is labelled instead of blinking');

    const health = snapshot({ health: { ...snapshot().health, status: 'hard', summary: 'Disk full', incidents: [{ id: 'disk-hard-1', resource: 'disk', severity: 'hard', summary: 'Disk full', openedAt: new Date().toISOString(), pauses: true }] } });
    assert.deepEqual(tileAttention(health, 'health'), { key: 'disk-hard-1', tone: 'error' });
});

test('pages replace the home grid, keep context and legend fixed and scroll their body', () => {
    const page = pageForTile('results');
    const context = { snapshot: snapshot(), terminal: terminal(80, 24), frame: 0, noQr: true, owning: false };
    const built = pageBody(page, context);
    const rendered = renderPage(context.snapshot, context.terminal, { ...built, scroll: page.scroll, attention: 0 });
    assert.equal(rendered.lines.length, 24);
    const text = rendered.lines.map(stripAnsi);
    assert.match(text[0], /Promptbook · PTBK {2}━━ birds ━━ ● running ━━ › Results and activity/, 'pages keep the shared header with their title');
    assert.doesNotMatch(text.join('\n'), /Current work|╭─ System/, 'the root grid is not rendered around the page');
    assert.match(text[2], /↑ \d+ more/, 'a long page shows what is above');
    assert.match(text.at(-3), /activity line 79/, 'following the activity keeps the newest line visible');
    assert.match(text.at(-1), /Esc back/);
    const top = renderPage(context.snapshot, context.terminal, { ...built, anchor: undefined, scroll: 0, attention: 0 });
    assert.match(top.lines.map(stripAnsi)[3], /This session/);
    assert.match(top.lines.map(stripAnsi).at(-2), /↓ \d+ more/);

    const system = pageBody(pageForTile('system'), { ...context, snapshot: snapshot({ service: { ...snapshot().service, state: 'pause', pauseReasons: [{ id: 'manual', kind: 'manual', owner: 'System', summary: 'Paused', since: new Date().toISOString(), removable: true }, { id: 'health:x', kind: 'health', owner: 'Health', severity: 'soft', summary: 'Low free disk', since: new Date().toISOString(), incident: 'x', removable: true }] } }) }).body.map(stripAnsi).join('\n');
    assert.match(system, /2 active reasons/);
    assert.match(system, /Manual pause \(System\)/);
    assert.match(system, /Health soft — Low free disk/);
    assert.match(system, /ptbk 0\.119\.0-33/, 'technical metadata lives on System');
    const healthPage = pageBody(pageForTile('health'), context);
    assert.doesNotMatch(healthPage.legend, /\bP\b|Pause|Resume/, 'Health offers no generic manual Pause/Resume');
    assert.match(healthPage.legend, /K clean cache/);
});

test('list pages keep the selected item across live updates and re-sorting', () => {
    const tasks = (titles) => titles.map((title, index) => ({ ref: `tasks/${title}.book`, title, readiness: 'ready', reason: 'Ready', priority: index, doneCount: 0, source: `tasks/${title}.book` }));
    const page = { ...pageForTile('tasks'), sort: 'name' };
    const context = { snapshot: snapshot(), inventory: tasks(['b', 'c']) };
    keepSelection(page, context);
    page.focus = 1;
    page.selected = 'tasks/c.book';
    keepSelection(page, { ...context, inventory: tasks(['a', 'b', 'c']) });
    assert.equal(page.focus, 2, 'a task inserted above does not move the cursor to another task');
    page.descending = true;
    keepSelection(page, { ...context, inventory: tasks(['a', 'b', 'c']) });
    assert.equal(page.focus, 0, 'reversing keeps the same task selected');
    keepSelection(page, { ...context, inventory: tasks(['a', 'b']) });
    assert.equal(page.selected, 'tasks/b.book', 'a vanished item leaves the cursor at its position');
});
