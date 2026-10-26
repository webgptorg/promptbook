import { formatShortTime } from '../common/time.js';
import { formatMiB } from '../engine/health.js';
import { domainAttention } from '../engine/attention.js';
import type { DashboardDomain, DomainAttention, ServiceSnapshot } from '../engine/snapshot.js';
import { fit, stringWidth, truncate, wrap } from './ansi.js';
import { activityLabel, inlineBadge } from './badges.js';
import { hasManualPause, healthPauseReasons, lifecycleActions } from './details.js';
import { renderPanel, sideBySide, type PanelTone } from './panels.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * Tiles of the dashboard home screen; each opens the dashboard page of its domain.
 *
 * @private terminal dashboard home
 */
export type HomeTile = DashboardDomain;

/**
 * Title of each tile (and of its page).
 *
 * @private terminal dashboard home
 */
export const TILE_TITLES: Readonly<Record<HomeTile, string>> = {
    work: 'Current work',
    system: 'System',
    health: 'Health',
    chats: 'Chats',
    tasks: 'Tasks',
    agents: 'Agents',
    tools: 'Tools',
    wallet: 'Wallet',
    results: 'Results',
    connection: 'Connection',
    sync: 'Synchronization',
};

/**
 * The tiles of a snapshot in home order (Synchronization only while autosync is enabled).
 *
 * @private terminal dashboard home
 */
export function homeTiles(snapshot: ServiceSnapshot): HomeTile[] {
    return ['work', 'system', 'health', 'chats', 'tasks', 'agents', 'tools', 'wallet', 'results', 'connection', ...(snapshot.sync ? (['sync'] as const) : [])];
}

/**
 * Attention of one tile: the engine's shared per-domain attention (an older engine's snapshot is derived locally with
 * the same function).
 *
 * @private terminal dashboard home
 */
export function tileAttention(snapshot: ServiceSnapshot, tile: HomeTile): DomainAttention | undefined {
    return (snapshot.attention ?? domainAttention(snapshot))[tile];
}

/**
 * Narrowest tile, including borders.
 */
const MIN_TILE_WIDTH = 26;

/**
 * Preferred tile width when the surface is wide (more columns beyond it).
 */
const PREFERRED_TILE_WIDTH = 36;

/**
 * Tallest tile, including borders (larger surfaces add spacing, not verbose dumps).
 */
const MAX_TILE_HEIGHT = 12;

/**
 * Rows of the shared application header: a prominent two-row identity band on ordinary surfaces, one compact row on
 * short ones (reserved before the tiles get room, so the home screen still never scrolls).
 *
 * @private terminal dashboard home
 */
export function headerRows(height: number): 1 | 2 {
    return height >= 16 ? 2 : 1;
}

/**
 * Geometry of the home screen for the current surface.
 *
 * @private terminal dashboard home
 */
export type HomeLayout =
    /** Bordered tiles in a grid (`rows` of tiles; every tile `height` rows tall). */
    | { readonly kind: 'grid'; readonly rows: readonly (readonly HomeTile[])[]; readonly widths: readonly number[]; readonly height: number }
    /** One line per tile when the surface is too short for bordered tiles. */
    | { readonly kind: 'list'; readonly rows: readonly (readonly HomeTile[])[] }
    /** The surface is too small for the complete home screen. */
    | { readonly kind: 'tiny'; readonly rows: readonly (readonly HomeTile[])[] };

/**
 * Chooses the home geometry: columns from the width (preferring roomy tiles), more columns when the height is short,
 * one line per tile on short surfaces and a minimal message on tiny ones. The complete home screen never needs
 * vertical scrolling.
 *
 * @private terminal dashboard home
 */
export function homeLayout(tiles: readonly HomeTile[], width: number, height: number): HomeLayout {
    // The header and the legend are reserved before the tiles get room.
    const room = height - headerRows(height) - 1;
    const maxColumns = Math.max(1, Math.floor((width + 1) / (MIN_TILE_WIDTH + 1)));
    let columns = Math.max(1, Math.min(maxColumns, Math.floor((width + 1) / (PREFERRED_TILE_WIDTH + 1)) || 1, tiles.length));
    const rowsFor = (count: number): number => Math.ceil(tiles.length / count);
    while (columns < maxColumns && rowsFor(columns) * 3 > room) columns++;
    const chunk = (count: number): HomeTile[][] => Array.from({ length: Math.ceil(tiles.length / count) }, (_, index) => tiles.slice(index * count, (index + 1) * count));
    if (rowsFor(columns) * 3 <= room) {
        const gaps = columns - 1;
        const base = Math.floor((width - gaps) / columns);
        const widths = Array.from({ length: columns }, (_, index) => base + (index < (width - gaps) % columns ? 1 : 0));
        return { kind: 'grid', rows: chunk(columns), widths, height: Math.min(MAX_TILE_HEIGHT, Math.floor(room / rowsFor(columns))) };
    }
    if (tiles.length <= room && width >= 30) return { kind: 'list', rows: tiles.map((tile) => [tile]) };
    return { kind: 'tiny', rows: tiles.map((tile) => [tile]) };
}

/**
 * Viewer-local presentation of the home screen.
 *
 * @private terminal dashboard home
 */
export type HomeView = {
    /** The operator's cursor (never moved by attention). */
    readonly focus: HomeTile;
    /** Attention per tile: `new` (conspicuous until the operator is clearly active) or `seen` (static warning). */
    readonly attention: ReadonlyMap<HomeTile, 'new' | 'seen'>;
    /** Animation frame (badge gesture and the blink phase of new attention). */
    readonly frame: number;
    readonly legend: string;
    readonly feedback?: string;
    readonly connectionLost?: string;
    /** Note under a pending owner stop. */
    readonly controlNote?: string;
};

/**
 * Smallest useful summary lines of one tile (never the complete domain; details live on its page).
 *
 * @private terminal dashboard home
 */
export function tileLines(snapshot: ServiceSnapshot, tile: HomeTile, terminal: TerminalProfile, frame: number): string[] {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const time = (iso?: string): string => (iso ? formatShortTime(Date.parse(iso)) : '');
    switch (tile) {
        case 'work': {
            const active = snapshot.active ?? (snapshot.current ? [snapshot.current] : []);
            const capacity = snapshot.capacity;
            if (active.length > 1 || (active.length && capacity && (capacity.queued || capacity.waiting))) {
                // Concurrent work: shared capacity first, then one line per active unit.
                return [
                    `${style.bold(`${active.length}${capacity ? `/${capacity.limit}` : ''}`)} active${capacity?.waiting ? style.muted(` · ${capacity.waiting} waiting`) : ''}${capacity?.queued ? style.muted(` · ${capacity.queued} queued`) : ''}`,
                    ...active.map((item) => (item.kind === 'chat' ? `${style.accent('chat')} ${item.taskTitle}` : `${inlineBadge(item.agent.name, item.agent.activity, style, terminal.reducedMotion ? 0 : frame)} ${item.taskTitle}${style.muted(` · ${item.phase}`)}`)),
                ];
            }
            const current = active[0];
            if (current) {
                return [
                    current.kind === 'chat' ? `${style.accent('chat')} ${style.muted('replying')}` : `${inlineBadge(current.agent.name, current.agent.activity, style, terminal.reducedMotion ? 0 : frame)} ${style.muted(activityLabel(current.agent.activity))}`,
                    current.taskTitle,
                    style.muted(`${current.phase}${current.attempt ? ` · attempt ${current.attempt}/${current.attemptBudget}` : ''}`),
                    ...(current.wait ? [style.warning(`${marks.wait} ${current.wait.reason}`)] : snapshot.wait ? [style.warning(`${marks.wait} ${snapshot.wait.reason}`)] : []),
                ];
            }
            if (snapshot.service.state === 'stopped') return [style.muted('The service is stopped.')];
            const blocker = snapshot.blockers[0];
            return [
                `${style.bold(snapshot.phase)}${snapshot.wait && !blocker ? style.muted(` ${marks.dot} ${snapshot.wait.reason}`) : ''}`,
                ...(blocker ? [style.error(`${marks.fail} ${blocker.title}`), style.muted(blocker.action ?? blocker.reason)] : []),
                ...(snapshot.wait?.until && !blocker ? [style.muted(`next ${time(snapshot.wait.until)}${snapshot.wait.skippable ? ' · S skips' : ''}`)] : []),
            ];
        }
        case 'system': {
            const state = snapshot.service.state;
            const tone = state === 'running' ? style.success : state === 'stopping' ? style.error : style.warning;
            const health = healthPauseReasons(snapshot);
            const why = health.length ? `paused by Health (${health.map((reason) => reason.severity).join(', ')})${hasManualPause(snapshot) ? ' + manual' : ''}` : hasManualPause(snapshot) && (state === 'pause' || state === 'pausing') ? 'paused manually' : '';
            const intent = snapshot.service.lifecycle?.intent;
            const keys = lifecycleActions(snapshot)
                .filter((action) => action.key)
                .map((action) => `${action.key} ${action.label}`);
            return [
                `${tone(state)}${why ? style.muted(` ${marks.dot} ${why}`) : ''}`,
                ...(intent && intent !== 'pause' ? [style.warning(`${intent} pending${snapshot.service.lifecycle?.draining ? ' (current task finishes first)' : ''}`)] : []),
                ...(snapshot.configuration?.pending ? [style.warning('configuration update pending')] : []),
                style.muted(keys.join(' · ')),
            ];
        }
        case 'health': {
            const health = snapshot.health;
            if (!health) return [style.muted('Not reported by this engine.')];
            const tone = health.status === 'ok' ? style.success : health.status === 'hard' ? style.error : health.status === 'unknown' ? style.muted : style.warning;
            return [
                tone(health.summary),
                style.muted(`disk ${formatMiB(health.disk.freeMiB)} · memory ${formatMiB(health.memory.availableMiB)}`),
                style.muted(`CPU ${health.cpu.load1 === undefined ? '?' : `${health.cpu.load1.toFixed(1)}/${health.cpu.cores}`} · network ${health.network.state}`),
                ...(healthPauseReasons(snapshot).length ? [style.warning('new background work is paused')] : []),
            ];
        }
        case 'wallet': {
            const wallet = snapshot.wallet;
            if (!wallet) return [style.muted('Not reported by this engine.')];
            const tone = wallet.state === 'unavailable' ? style.error : wallet.state === 'locked' || wallet.state === 'setup' || wallet.pending.length ? style.warning : wallet.state === 'ready' ? style.success : style.muted;
            const first = wallet.pending[0];
            return [
                tone(wallet.summary),
                ...(first ? [style.warning(`${marks.warn} login for ${first.origin.replace(/^https?:\/\//, '')}${first.problem === 'rejected' ? ' (rejected)' : ''}`)] : []),
                style.muted(wallet.state === 'locked' ? 'W open · restore it there' : 'W open'),
            ];
        }
        case 'chats': {
            const waiting = snapshot.chats.waiting;
            const first = waiting[0];
            return [
                waiting.length ? style.warning(`${marks.warn} ${waiting.length} waiting for you`) : style.muted('Nobody waits for you'),
                ...(first ? [`${style.bold(first.awaiting?.sender ?? first.agent ?? 'An agent')}: ${(first.awaiting?.text ?? first.name).split('\n')[0]}`] : []),
                style.muted(`${snapshot.chats.total} chat${snapshot.chats.total === 1 ? '' : 's'}${snapshot.chats.unread ? ` · ${snapshot.chats.unread} unread` : ''}`),
                style.muted(waiting.length ? 'A answer · C new chat' : 'C new chat'),
            ];
        }
        case 'tasks': {
            const count = (kinds: readonly string[]): number => snapshot.queue.filter((item) => kinds.includes(item.readiness)).length;
            const parts = [
                [count(['ready', 'active', 'needs-assignment', 'assigning']), 'ready'],
                [count(['awaiting-user']), 'waiting for you'],
                [count(['blocked', 'failed', 'needs-recovery', 'incompatible', 'not-ready', 'placeholder']), 'blocked'],
                [count(['waiting-until', 'waiting-dependency']), 'later'],
            ].filter(([value]) => value) as Array<[number, string]>;
            const next = snapshot.queue.find((item) => item.readiness === 'ready') ?? snapshot.queue[0];
            return [
                `${style.bold(String(snapshot.queueTotal))} unfinished${parts.length ? style.muted(` · ${parts.map(([value, label]) => `${value} ${label}`).join(' · ')}`) : ''}`,
                ...(next ? [`${style.muted('next')} ${next.title}`] : [style.muted('No unfinished tasks.')]),
            ];
        }
        case 'agents': {
            const working = snapshot.agents.filter((agent) => agent.activity !== 'idle');
            const shown = [...working, ...snapshot.agents.filter((agent) => agent.activity === 'idle')];
            return [style.muted(`${snapshot.agents.length} agent${snapshot.agents.length === 1 ? '' : 's'}${working.length ? ` · ${working.length} active` : ''}`), ...shown.map((agent) => `${inlineBadge(agent.name, agent.activity, style, terminal.reducedMotion ? 0 : frame)} ${style.muted(activityLabel(agent.activity))}`)];
        }
        case 'tools': {
            const tools = snapshot.tools;
            if (!tools) return [style.muted('Not reported by this engine.')];
            const summary = (type: 'HARNESS' | 'BROWSER', label: string): string => {
                const items = tools.items.filter((item) => item.type === type);
                const usable = items.filter((item) => item.state === 'usable').length;
                const text = `${label} ${usable}/${items.length}`;
                return items.length && usable === 0 ? style.warning(text) : text;
            };
            const inUse = tools.items.filter((item) => item.inUse).map((item) => item.name);
            return [
                `${summary('HARNESS', 'Harnesses')} ${style.muted(marks.dot)} ${summary('BROWSER', 'Browsers')}`,
                ...(tools.waiting ? [style.warning(`new work waits: ${tools.waiting.reason}`)] : []),
                ...tools.problems.slice(0, 1).map((problem) => style.warning(problem)),
                ...(inUse.length ? [style.muted(`in use: ${inUse.join(', ')}`)] : []),
            ];
        }
        case 'results': {
            const last = snapshot.results.recent[0];
            const activity = snapshot.activity[snapshot.activity.length - 1];
            const error = snapshot.errors[snapshot.errors.length - 1];
            return [
                `${style.success(`${marks.ok} ${snapshot.results.completed}`)} ${style.muted('completed')}  ${snapshot.results.failed ? style.error(`${marks.fail} ${snapshot.results.failed}`) : style.muted(`${marks.fail} 0`)} ${style.muted('failed')}`,
                ...(last ? [`${last.outcome.startsWith('completed') ? style.success(marks.ok) : last.outcome === 'failed' ? style.error(marks.fail) : style.warning(marks.wait)} ${last.title}`] : []),
                ...(error ? [style.warning(`last error: ${error.summary}`)] : activity ? [style.muted(`${time(activity.at)} ${activity.text}`)] : []),
            ];
        }
        case 'connection': {
            const { local, remote } = snapshot.connection;
            const host = local.url ? local.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined;
            return [
                remote.state === 'ready' ? style.success(`Remote ready${remote.provider ? ` via ${remote.provider}` : ''}`) : remote.state === 'disabled' ? style.muted(local.state === 'disabled' ? 'No HTTP server' : 'Local only') : style.warning(`Remote ${remote.state}`),
                ...(host ? [style.muted(`local ${host}`)] : []),
                style.muted(snapshot.connection.pairing?.available ? 'pairing link ready · Enter for QR' : 'Enter: links, QR, pairing'),
            ];
        }
        case 'sync': {
            const sync = snapshot.sync;
            if (!sync) return [];
            const tone = sync.state === 'synchronized' ? style.success : sync.state === 'never' ? style.muted : style.warning;
            return [
                `${tone(sync.phase === 'idle' ? sync.state : sync.phase)}${sync.incoming || sync.outgoing ? style.muted(` · ${sync.incoming ?? '?'} in / ${sync.outgoing ?? '?'} out`) : ''}`,
                ...(sync.upstream ? [style.muted(`${sync.branch} ↔ ${sync.upstream}`)] : []),
                ...(sync.reason ? [style.warning(sync.reason)] : []),
                style.muted('G synchronize now'),
            ];
        }
    }
}

/**
 * The shared application header above the tile grid (and every page): a full-width identity band naming Promptbook /
 * PTBK and the project, with attention and freshness on the right. It carries no lifecycle or pause state (System and
 * the related tiles show it). Ordinary surfaces get two rows: the identity line over a heavy accent rule; short ones
 * get one compact row. Its rule (and, with colors, the inverse identity badge) sets it apart from the bordered,
 * focusable tiles; it is never a tile. Narrow widths drop freshness, then the attention count (the tiles keep their
 * marks), then the word Promptbook, and only then shorten the project.
 *
 * @private terminal dashboard home
 */
export function homeHeader(snapshot: ServiceSnapshot, terminal: TerminalProfile, width: number, options: { readonly rows: 1 | 2; readonly attention: number; readonly connectionLost?: string; readonly context?: string }): string[] {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const rule = terminal.unicode ? '━' : '=';
    const separator = style.accent(` ${rule}${rule} `);
    const attention = options.attention ? style.warning(`${marks.warn} ${options.attention} need${options.attention === 1 ? 's' : ''} attention`) : '';
    const freshness = options.connectionLost ? style.error(`disconnected: ${options.connectionLost}`) : style.muted(`live ${formatShortTime(Date.parse(snapshot.observedAt))}`);
    const identity = (label: string): string => style.bold(style.inverse(style.accent(` ${label} `)));
    const mode = snapshot.service.commitMode === 'no-commit' ? style.warning(' · NO-COMMIT') : '';
    const brands = [`Promptbook ${marks.dot} PTBK`, 'PTBK'];
    const details = [[attention, freshness].filter(Boolean), [attention].filter(Boolean), []];
    if (options.rows === 2) {
        // The identity line over a full-width heavy rule: prominent, yet only two rows.
        const left = (label: string): string => ` ${identity(label)}  ${style.bold(snapshot.project.name)}${mode}${options.context ? `${style.muted(` ${marks.dot} `)}${style.bold(options.context)}` : ''}`;
        const right = (parts: readonly string[]): string => (parts.length ? `${parts.join(style.muted(` ${marks.dot} `))} ` : '');
        const candidates = brands.flatMap((brand) => details.map((parts) => [left(brand), right(parts)] as const));
        const [head, tail] = candidates.find(([head, tail]) => stringWidth(head) + stringWidth(tail) + 1 <= width) ?? candidates.at(-1)!;
        const fill = Math.max(1, width - stringWidth(head) - stringWidth(tail));
        return [truncate(`${head}${' '.repeat(fill)}${tail}`, width), style.accent(rule.repeat(width))];
    }
    const left = (label: string): string => `${style.accent(`${rule}${rule}`)} ${identity(label)}${separator}${style.bold(snapshot.project.name)}${mode}${options.context ? `${separator}${style.bold(`› ${options.context}`)}` : ''} `;
    const right = (parts: readonly string[]): string => (parts.length ? ` ${parts.join(style.muted(` ${marks.dot} `))} ${style.accent(`${rule}${rule}`)}` : style.accent(`${rule}${rule}`));
    const candidates = brands.flatMap((brand) => details.map((parts) => [left(brand), right(parts)] as const));
    const [head, tail] = candidates.find(([head, tail]) => stringWidth(head) + stringWidth(tail) + 1 <= width) ?? candidates.at(-1)!;
    const fill = Math.max(0, width - stringWidth(head) - stringWidth(tail));
    return [truncate(`${head}${style.accent(rule.repeat(fill))}${tail}`, width)];
}

/**
 * Joins legend items in priority order, keeping as many as fit the width (the most important ones first).
 *
 * @private terminal dashboard home
 */
export function fitLegend(items: readonly string[], width: number, separator = ' · '): string {
    let legend = '';
    for (const item of items) {
        const candidate = legend ? `${legend}${separator}${item}` : item;
        if (stringWidth(candidate) + 1 > width) continue;
        legend = candidate;
    }
    return ` ${legend}`;
}

/**
 * Renders the complete dashboard home screen, exactly fitting the surface (never taller than it).
 *
 * @private terminal dashboard home
 */
export function renderHome(snapshot: ServiceSnapshot, terminal: TerminalProfile, view: HomeView): string[] {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const width = Math.max(20, terminal.columns());
    const height = Math.max(5, terminal.rows());
    const tiles = homeTiles(snapshot);
    const layout = homeLayout(tiles, width, height);
    const attentionCount = [...view.attention.keys()].filter((tile) => tiles.includes(tile)).length;
    const lines = homeHeader(snapshot, terminal, width, { rows: headerRows(height), attention: attentionCount, connectionLost: view.connectionLost });
    const blinkOn = !terminal.reducedMotion && view.frame % 2 === 0;
    const titleOf = (tile: HomeTile): string => {
        const attention = view.attention.get(tile);
        // Focus is the double border and bold heading (never a prefix that would shift the title).
        const label = `${attention ? `${marks.warn} ` : ''}${TILE_TITLES[tile]}${attention === 'new' && terminal.reducedMotion ? ' NEW' : ''}`;
        return attention === 'new' && blinkOn ? style.inverse(label) : label;
    };
    const toneOf = (tile: HomeTile): PanelTone => {
        const attention = view.attention.get(tile);
        if (attention) return attention === 'new' && !blinkOn && !terminal.reducedMotion ? 'default' : tileAttention(snapshot, tile)?.tone === 'error' ? 'error' : 'attention';
        return view.focus === tile ? 'accent' : 'default';
    };
    if (layout.kind === 'grid') {
        for (const row of layout.rows) {
            const blocks = row.map((tile, index) =>
                renderPanel({
                    title: titleOf(tile),
                    lines: tileLines(snapshot, tile, terminal, view.frame).slice(0, layout.height - 2),
                    width: layout.widths[index]!,
                    tone: toneOf(tile),
                    unicode: terminal.unicode,
                    style,
                    minHeight: layout.height - 2,
                    focused: view.focus === tile,
                }),
            );
            lines.push(...sideBySide(blocks, layout.widths.slice(0, blocks.length)));
        }
    } else if (layout.kind === 'list') {
        const labelWidth = Math.max(...tiles.map((tile) => stringWidth(TILE_TITLES[tile]))) + 4;
        for (const tile of tiles) {
            const attention = view.attention.get(tile);
            const label = fit(`${view.focus === tile ? marks.pointer : ' '} ${attention ? marks.warn : ' '} ${TILE_TITLES[tile]}`, labelWidth);
            const styled = view.focus === tile ? style.bold(style.accent(label)) : attention ? style.warning(label) : label;
            lines.push(truncate(`${attention === 'new' && blinkOn ? style.inverse(styled) : styled} ${tileLines(snapshot, tile, terminal, view.frame)[0] ?? ''}`, width));
        }
    } else {
        lines.push(...wrap('The terminal is too small for the dashboard. Enlarge it, or press O for plain output.', width - 1).map((line) => style.warning(` ${line}`)));
    }
    const footer = `${view.controlNote ? `${view.controlNote}  ` : ''}${view.feedback ? `${view.legend}   ${style.accent(marks.arrow)} ${view.feedback}` : view.legend}`;
    while (lines.length < height - 1) lines.push('');
    lines.length = Math.min(lines.length, height - 1);
    lines.push(truncate(style.muted(footer), width));
    return lines;
}

/**
 * A full dashboard page: fixed identity/title and context lines, a scrollable body and a fixed legend. The body
 * window keeps `anchor` (a focused list row) visible; the returned scroll is the viewer's new local position.
 *
 * @private terminal dashboard home
 */
export function renderPage(
    snapshot: ServiceSnapshot,
    terminal: TerminalProfile,
    page: { readonly title: string; readonly context?: string; readonly body: readonly string[]; readonly anchor?: number; readonly scroll: number; readonly legend: string; readonly feedback?: string; readonly connectionLost?: string; readonly attention: number },
): { readonly lines: string[]; readonly scroll: number } {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const width = Math.max(20, terminal.columns());
    const height = Math.max(6, terminal.rows());
    const rule = (label = ''): string => style.muted(fit(`${terminal.unicode ? '─' : '-'}${label ? ` ${label} ` : ''}${(terminal.unicode ? '─' : '-').repeat(width)}`, width));
    const header = homeHeader(snapshot, terminal, width, { rows: headerRows(height), attention: page.attention, connectionLost: page.connectionLost, context: page.title });
    const room = Math.max(1, height - 4 - header.length);
    const maxScroll = Math.max(0, page.body.length - room);
    let scroll = Math.max(0, Math.min(page.scroll, maxScroll));
    if (page.anchor !== undefined) {
        if (page.anchor < scroll) scroll = page.anchor;
        else if (page.anchor >= scroll + room) scroll = page.anchor - room + 1;
        scroll = Math.max(0, Math.min(scroll, maxScroll));
    }
    const body = page.body.slice(scroll, scroll + room).map((line) => ` ${line}`);
    while (body.length < room) body.push('');
    const above = scroll;
    const below = Math.max(0, page.body.length - scroll - room);
    const footer = page.feedback ? `${page.legend}   ${style.accent(marks.arrow)} ${page.feedback}` : page.legend;
    return {
        scroll,
        lines: [
            ...header,
            style.muted(truncate(` ${page.context ?? ''}`, width)),
            rule(above ? `↑ ${above} more` : ''),
            ...body,
            rule(below ? `↓ ${below} more` : ''),
            truncate(style.muted(footer), width),
        ],
    };
}
