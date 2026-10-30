import assert from 'node:assert/strict';
import { test } from 'node:test';
import { headerRows, homeLayout, homeTiles, renderHome, renderPage, tileAttention } from '../dist/ui/dashboard-home.js';
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
        connection: { local: { state: 'ready', url: 'http://127.0.0.1:3000/' } },
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
        for (const title of ['Current work', 'System', 'Health', 'Chats', 'Tasks', 'Agents', 'Tools', 'Wallet', 'Results', 'Connection']) assert.match(text, new RegExp(title), `${columns}x${rows}: ${title} is visible`);
        const header = headerRows(rows);
        if (header === 2) {
            assert.match(stripAnsi(lines[0]), /^ {2}(Promptbook · )?PTBK {3}birds\b/, `${columns}x${rows}: the full-width Promptbook/PTBK and project identity heads the screen`);
            assert.match(stripAnsi(lines[1]), /^━+$/, `${columns}x${rows}: a heavy rule completes the two-row identity band`);
        } else assert.match(stripAnsi(lines[0]), /^━━ {2}(Promptbook · )?PTBK {2}━━ birds .*━━$/, `${columns}x${rows}: a short surface keeps one compact identity row`);
        for (const line of lines.slice(0, header)) {
            assert.equal(stringWidth(line), columns, `${columns}x${rows}: the header band fills the width`);
            assert.doesNotMatch(stripAnsi(line), /[╭╮│╔╗║]/, `${columns}x${rows}: the header is not another bordered tile`);
            assert.doesNotMatch(stripAnsi(line), /running|paus|stopp/, `${columns}x${rows}: lifecycle state stays in the tiles, not in the identity header`);
        }
        const layout = homeLayout(homeTiles(snapshot()), columns, rows, 1);
        assert.ok(layout.brief >= 1 || header === 1, `${columns}x${rows}: the brief keeps at least one row on ordinary surfaces`);
        assert.match(stripAnsi(lines.slice(0, header + layout.brief).join("\n")), /project brief|This engine does/, `${columns}x${rows}: the brief (or its beginning, here honestly unavailable) follows the identity`);
        if (layout.kind === 'grid') assert.match(stripAnsi(lines[header + layout.brief]), /^╔/, `${columns}x${rows}: the tile grid (focused tile first) starts right below the header and brief`);
        assert.doesNotMatch(text, /0\.119\.0-33|very-long-directory|trycloudflare/, 'version, path and URLs live on pages, not on the root');
    }
    assert.equal(homeLayout(homeTiles(snapshot()), 120, 30).kind, 'grid');
    assert.ok(homeLayout(homeTiles(snapshot()), 200, 50).rows[0].length > homeLayout(homeTiles(snapshot()), 80, 24).rows[0].length, 'wider surfaces use more columns');
    // One line per tile below the identity rows and one brief row, above the legend: the threshold follows the domains.
    const listRows = homeTiles(snapshot()).length + 3;
    const shortRows = listRows + (headerRows(listRows) === 2 ? 1 : 0);
    assert.equal(homeLayout(homeTiles(snapshot()), 70, shortRows).kind, 'list', 'short surfaces fall back to one line per tile');
    assert.equal(homeLayout(homeTiles(snapshot()), 70, shortRows).brief, 1, 'the list keeps the brief');
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
    assert.match(lines, /╔═ Current work/, 'focus stays where the operator left it');
    assert.match(lines, /▲ Chats/, 'the attention tile is marked');
    assert.doesNotMatch(lines, /╔═ ▲ Chats/);
    assert.match(lines, /1 needs attention/);
    const both = renderHome(waiting, terminal(120, 30), view({ focus: 'chats', attention: new Map([['chats', 'seen']]) })).map(stripAnsi).join('\n');
    assert.match(both, /╔═ ▲ Chats/, 'focus and attention are both visible on one tile');
    const reduced = renderHome(waiting, terminal(120, 30, { reducedMotion: true }), view({ attention: new Map([['chats', 'new']]) })).map(stripAnsi).join('\n');
    assert.match(reduced, /▲ Chats NEW/, 'without animation, unseen attention is labelled instead of blinking');

    const health = snapshot({ health: { ...snapshot().health, status: 'hard', summary: 'Disk full', incidents: [{ id: 'disk-hard-1', resource: 'disk', severity: 'hard', summary: 'Disk full', openedAt: new Date().toISOString(), pauses: true }] } });
    assert.deepEqual(tileAttention(health, 'health'), { key: 'disk-hard-1', tone: 'error' });
});

test('focus is a double-line border and bold heading that never changes tile geometry', () => {
    const single = { '╔': '╭', '╗': '╮', '╚': '╰', '╝': '╯', '═': '─', '║': '│' };
    const normalized = (focus) => renderHome(snapshot(), terminal(120, 30), view({ focus })).map(stripAnsi).map((line) => line.replace(/[╔╗╚╝═║]/g, (char) => single[char]));
    const tiles = homeTiles(snapshot());
    const reference = normalized('work');
    for (const tile of tiles) {
        const lines = renderHome(snapshot(), terminal(120, 30), view({ focus: tile })).map(stripAnsi);
        assert.equal(lines.filter((line) => /[╔╗╚╝]/.test(line)).length, 2, `${tile}: exactly one tile has the double border`);
        assert.deepEqual(normalized(tile), reference, `${tile}: moving focus changes no size, position or content`);
    }
    // With colors the focused heading is bold and the others are not; the border alone is visible without color.
    const colored = { ...terminal(120, 30), style: { ...terminal(120, 30).style, bold: (text) => `<b>${text}</b>` } };
    const text = renderHome(snapshot(), colored, view({ focus: 'system' })).join('\n');
    assert.match(text, /<b> System <\/b>/);
    assert.doesNotMatch(text, /<b> Health <\/b>/);
});

test('pages replace the home grid, keep context and legend fixed and scroll their body', () => {
    const page = pageForTile('results');
    const context = { snapshot: snapshot(), terminal: terminal(80, 24), frame: 0, owning: false };
    const built = pageBody(page, context);
    const rendered = renderPage(context.snapshot, context.terminal, { ...built, scroll: page.scroll, attention: 0 });
    assert.equal(rendered.lines.length, 24);
    const text = rendered.lines.map(stripAnsi);
    assert.match(text[0], /Promptbook · PTBK {3}birds · Results and activity/, 'pages keep the shared header with their title');
    assert.match(text[1], /^━+$/);
    assert.doesNotMatch(text.join('\n'), /Current work|╭─ System/, 'the root grid is not rendered around the page');
    assert.match(text[3], /↑ \d+ more/, 'a long page shows what is above');
    assert.match(text.at(-3), /activity line 79/, 'following the activity keeps the newest line visible');
    assert.match(text.at(-1), /Esc back/);
    const top = renderPage(context.snapshot, context.terminal, { ...built, anchor: undefined, scroll: 0, attention: 0 });
    assert.match(top.lines.map(stripAnsi)[4], /This session/);
    assert.match(top.lines.map(stripAnsi).at(-2), /↓ \d+ more/);

    const system = pageBody(pageForTile('system'), { ...context, snapshot: snapshot({ service: { ...snapshot().service, state: 'pause', pauseReasons: [{ id: 'manual', kind: 'manual', owner: 'System', summary: 'Paused', since: new Date().toISOString(), removable: true }, { id: 'health:x', kind: 'health', owner: 'Health', severity: 'soft', summary: 'Low free disk', since: new Date().toISOString(), incident: 'x', removable: true }] } }) }).body.map(stripAnsi).join('\n');
    assert.match(system, /2 active reasons/);
    assert.match(system, /Manual pause \(System\)/);
    assert.match(system, /Health soft — Low free disk/);
    assert.match(system, /ptbk 0\.119\.0-33/, 'technical metadata lives on System');
    // The engine update policy switch lives on System (progress is a system task in Tasks), not on Connection.
    const update = { policy: { isAutoUpdateEnabled: true, source: 'default' }, current: '0.119.0-33', installation: { scope: 'local', path: '/p/node_modules/ptbk' }, phase: 'idle', reason: 'ptbk 0.119.0-33 is the newest allowed release.', latest: '0.119.0-33', isSupported: true };
    const withUpdate = { ...context, snapshot: snapshot({ update }) };
    const systemPage = pageBody(pageForTile('system'), withUpdate);
    assert.match(systemPage.body.map(stripAnsi).join('\n'), /Engine updates[\s\S]*Automatic +on · updates\.isAutoUpdateEnabled \(default\)/);
    assert.match(systemPage.legend, /A turn automatic updates off · C check for a release now/);
    const connectionPage = pageBody({ kind: 'connection', scroll: 0 }, withUpdate);
    assert.doesNotMatch(`${connectionPage.body.map(stripAnsi).join('\n')}\n${connectionPage.legend}`, /Engine updates|automatic updates/);
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

test('the Wallet tile and page show readiness, requests and labels with the common attention, never a secret', () => {
    const at = new Date().toISOString();
    const wallet = {
        state: 'ready',
        summary: '1 saved login · 1 login request waiting',
        facility: 'macos-keychain',
        records: [{ id: 'r1', origin: 'https://example.com', account: 'ja…@example.com', updatedAt: at, lastUsedAt: at, lastOutcome: 'signed-in' }],
        pending: [{ id: 'a1', origin: 'https://news.example', problem: 'missing', reason: 'A login for https://news.example is needed; the Wallet has none.', tasks: ['Weekly update'], browser: 'project-browser', createdAt: at, requests: 2 }],
    };
    const view = snapshot({ wallet });
    assert.ok(homeTiles(view).includes('wallet'), 'Wallet is a home tile');
    assert.equal(tileAttention(view, 'wallet')?.tone, 'warning', 'a pending login request uses the common attention');
    assert.equal(tileAttention(snapshot({ wallet: { ...wallet, pending: [] } }), 'wallet'), undefined, 'a ready Wallet without requests needs no attention');
    assert.equal(tileAttention(snapshot({ wallet: { ...wallet, pending: [], state: 'locked', problem: 'Enter the 12 words for recovery once.' } }), 'wallet')?.tone, 'warning', 'a locked Wallet asks for its restoration');
    const home = renderHome(view, terminal(120, 30), { focus: 'wallet', attention: new Map(), frame: 0, legend: ' Q leave' }).map(stripAnsi).join('\n');
    assert.match(home, /1 saved login · 1 login request/);
    assert.match(home, /login for news\.example/);
    const context = { snapshot: view, terminal: terminal(120, 30), frame: 0, owning: false };
    const page = pageBody(pageForTile('wallet'), context);
    const text = page.body.map(stripAnsi).join('\n');
    assert.match(text, /https:\/\/news\.example · no saved login · for Weekly update/);
    assert.match(text, /https:\/\/example\.com · ja…@example\.com/);
    assert.match(text, /never shown here/);
    assert.match(page.legend, /N add login/);
    assert.match(page.legend, /Enter add this login · X dismiss/, 'the focused request offers its protected input');
    const empty = pageBody(pageForTile('wallet'), { ...context, snapshot: snapshot({ wallet: { state: 'empty', summary: 'Not set up (no saved logins)', records: [], pending: [] } }) });
    assert.match(empty.legend, /S set up \(shows 12 words for recovery once\)/);
    assert.doesNotMatch(`${text}\n${empty.body.join('\n')}`, /seed|mnemonic|BIP|passphrase/i, 'no technical jargon in the Wallet UI');
});

test('Usage tile and page: a seven-day summary with grouping-specific labels, visible billing mode and certainty, no price internals', () => {
    const totals = (change = {}) => ({ units: 3, input: 12000, output: 3400, cachedInput: 0, reasoning: 0, reportedCostUsd: 0, calculated: { apiUsd: 0.42, subscriptionEquivalentUsd: 1.5, priced: 2, estimated: 1, unpriced: 0 }, billing: { subscription: 2, api: 1, unknown: 0 }, coverage: { reported: 2, unavailable: 1, costReported: 0 }, ...change });
    const usage = {
        days: 7,
        from: new Date(Date.now() - 7 * 86400000).toISOString(),
        to: new Date().toISOString(),
        computedAt: new Date().toISOString(),
        total: totals(),
        breakdowns: { agent: [{ label: 'Developer', ...totals() }], agentInclusive: [{ label: 'Developer', ...totals({ input: 20000 }) }, { label: 'Lawyer', ...totals({ units: 1 }) }], harness: [{ label: 'openai-codex (codex)', ...totals() }], model: [{ label: 'gpt-test', ...totals() }], work: [{ label: 'task', ...totals() }] },
    };
    const view = terminal(120, 40);
    const tile = renderHome(snapshot({ usage }), view, { focus: 'usage', attention: new Map(), frame: 0, legend: '' }).map(stripAnsi).join('\n');
    assert.match(tile, /Usage/);
    assert.match(tile, /15k tokens · 3 runs · 7 days/);
    assert.match(tile, /M open/);
    const context = { snapshot: snapshot({ usage }), terminal: view, frame: 0, owning: false };
    const page = pageForTile('usage');
    const byAgent = pageBody(page, context).body.map(stripAnsi).join('\n');
    assert.match(byAgent, /^By executing agent$/m);
    assert.match(byAgent, /^Developer +12k in · 3\.4k out/m);
    assert.match(byAgent, /2 subscription · 1 API/, 'billing mode stays visible');
    assert.match(byAgent, /1 without reported usage/, 'missing usage is visible, not zero');
    assert.match(byAgent, /\$0\.42 API \(partly estimated\)/);
    assert.match(byAgent, /\$1\.50 token-price equivalent of subscription work/);
    assert.doesNotMatch(byAgent, /observedAt|effectiveFrom|price list version/i, 'technical price internals stay hidden');
    assert.doesNotMatch(byAgent, /openai-codex/, 'an agent view does not force a harness column');
    const inclusive = pageBody({ ...page, inclusive: true }, context).body.map(stripAnsi).join('\n');
    assert.match(inclusive, /including work it initiated \(rows overlap\)/);
    assert.match(inclusive, /^Lawyer/m);
    const byHarness = pageBody({ ...page, grouping: 'harness' }, context).body.map(stripAnsi).join('\n');
    assert.match(byHarness, /^openai-codex \(codex\)/m);
    assert.doesNotMatch(byHarness, /^Developer/m);
});

test('Action log tile and page: saved external actions with explicit partial/uncertain outcomes and pending persistence', () => {
    // Today's time keeps the short clock form, so the tile layout does not depend on the date the suite runs.
    const at = new Date().toISOString();
    const record = (change) => ({ path: 'actions/2026-10-29-news/2026-10-29-1015-send-email-gmail.md', task: '2026-10-29-news', taskName: 'Weekly news', source: 'tasks/2026-10-29-news.book', operation: 'Send email', service: 'Gmail', target: 'reader@example.test', outcome: 'confirmed', at, agent: '@Developer', ...change });
    const actions = { total: 2, recent: [record({ path: 'actions/2026-10-29-news/b.md', operation: 'Publish post', service: 'LinkedIn', outcome: 'uncertain', pending: true }), record({})], pending: 1, unresolved: 0 };
    const view = terminal(120, 40);
    const tile = renderHome(snapshot({ actions }), view, { focus: 'actions', attention: new Map(), frame: 0, legend: '' }).map(stripAnsi).join('\n');
    assert.match(tile, /Action log/);
    assert.match(tile, /2 external actions recorded/);
    assert.match(tile, /uncertain Publish post/, 'the outcome comes first and stays visible');
    assert.match(tile, /1 not committed yet/);
    const page = pageBody(pageForTile('actions'), { snapshot: snapshot({ actions }), terminal: view, frame: 0, owning: false });
    const body = page.body.map(stripAnsi).join('\n');
    assert.match(page.context, /2 external actions · saved Markdown records in actions\/, independent of traces · 1 not committed/);
    assert.match(body, /Publish post · LinkedIn → reader@example\.test uncertain · not committed · @Developer · Weekly news/);
    assert.match(body, /Send email · Gmail → reader@example\.test confirmed/);
    const empty = pageBody(pageForTile('actions'), { snapshot: snapshot({ actions: { total: 0, recent: [], pending: 0, unresolved: 0 } }), terminal: view, frame: 0, owning: false }).body.map(stripAnsi).join('\n');
    assert.match(empty, /earlier tasks may have external work without a record/, 'empty prospective history is not a claim that nothing happened');
    // An opened record offers only its verified links: the task Book and evidence, and the receipt in its context.
    const opened = (links) => pageBody({ kind: 'action', scroll: 0, path: record({}).path, content: '# Send email', links }, { snapshot: snapshot({ actions }), terminal: view, frame: 0, owning: false });
    const linked = opened({ task: 'tasks/2026-10-29-news.book', evidence: 'traces/2026-10-29-news', receipt: 'https://mail.example.test/sent/42' });
    assert.match(linked.legend, /E open the task Book · T open the evidence/);
    assert.match(linked.context, /receipt https:\/\/mail\.example\.test\/sent\/42/);
    const unverified = opened({});
    assert.doesNotMatch(unverified.legend, /task Book|evidence/, 'a task or evidence no longer in the project is not offered');
    assert.doesNotMatch(unverified.context, /receipt/);
});

test('project brief beneath the identity: the saved paragraph with its time, labelled clipping and honest absence', () => {
    const text = 'Publishing is on schedule. A temporary provider outage is awaiting its announced reset while other work continues. No action is needed from you.';
    const report = { path: 'report.book', state: 'available', brief: { text, at: new Date().toISOString() } };
    const wide = renderHome(snapshot({ report }), terminal(200, 50), view()).map(stripAnsi);
    assert.match(wide[2], /^ \S+ Publishing is on schedule\. A temporary provider outage/, 'the full-width brief comes right after the two-row identity');
    assert.doesNotMatch(wide.join('\n'), /CHAT MESSAGE|@Chatter/, 'parsed text, never raw Book syntax');
    const narrow = renderHome(snapshot({ report }), terminal(60, 18), view()).map(stripAnsi);
    const layout = homeLayout(homeTiles(snapshot()), 60, 18, 3);
    assert.match(narrow.slice(2, 2 + layout.brief).join(' '), /… J O full brief/, 'clipping is labelled with how to read it whole');
    const pending = renderHome(snapshot({ report: { ...report, generating: true } }), terminal(200, 50), view()).map(stripAnsi);
    assert.match(pending.slice(2, 5).join(' '), /updating…/, 'the previous brief stays readable while a new one is written');
});
