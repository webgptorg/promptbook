import QRCode from 'qrcode';
import { formatShortTime } from '../common/time.js';
import { formatMiB } from '../engine/health.js';
import type { ServiceSnapshot } from '../engine/snapshot.js';
import { stringWidth, truncate, wrap } from './ansi.js';

/**
 * Flows styled items into lines no wider than `width` (items are never cut).
 */
function flow(items: readonly string[], width: number, separator: string): string[] {
    const lines: string[] = [];
    let line = '';
    for (const item of items) {
        const candidate = line ? `${line}${separator}${item}` : item;
        if (line && stringWidth(candidate) > width) {
            lines.push(line);
            line = item;
        } else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
}
import { activityLabel, framedBadge, inlineBadge } from './badges.js';
import { smartTaskOrder, type TaskInventoryItem } from '../tasks/views.js';
import { browserDetailLines, executionDetailLines, executionOneLine, healthDetailLines, healthOneLine, lifecycleActions, lifecycleExplanation, lifecycleSummary, pauseReasonLines, syncCompactLines, syncDetailLines, toolRow, toolsCompactLines } from './details.js';
import { renderPanel, sideBySide, type PanelTone } from './panels.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * Regions of the live dashboard that keyboard focus moves between.
 *
 * @private shared status view
 */
export type DashboardPanel = 'attention' | 'controls' | 'work' | 'connection' | 'tools' | 'sync' | 'agents' | 'chats' | 'tasks' | 'results';

/**
 * The visible panels as spatial rows (arrows move between rows and within a row), matching the rendered layout.
 *
 * @private shared status view
 */
export function dashboardPanels(snapshot: ServiceSnapshot, columns: number): DashboardPanel[][] {
    const wide = Math.min(columns, 140) >= 100;
    const attention: DashboardPanel[][] = snapshot.chats.waiting.length ? [['attention']] : [];
    if (wide) return [...attention, ['controls'], ['work', 'connection'], ['tools', snapshot.sync ? 'sync' : 'connection'], ['agents', 'chats', 'tasks'], ['results']];
    return [...attention, ['controls'], ['work'], ['tools'], ...(snapshot.sync ? [['sync'] as DashboardPanel[]] : []), ['agents'], ['chats'], ['tasks'], ['results'], ['connection']];
}

/**
 * QR code prepared for the connection panel.
 *
 * @private shared status view
 */
export type PreparedQr = {
    /** Encoded URL (may contain the pairing secret in its fragment). */
    readonly url: string;
    /** Rendered terminal lines. */
    readonly lines: readonly string[];
    /** Label describing what the code opens. */
    readonly label: string;
    /** Whether it carries a sensitive pairing capability. */
    readonly sensitive: boolean;
};

/**
 * Renders a QR code for the terminal (half-block characters).
 *
 * @private shared status view
 */
export async function renderQr(url: string): Promise<string[]> {
    const text = await QRCode.toString(url, { type: 'terminal', small: true, errorCorrectionLevel: 'L' });
    return text.replace(/\n+$/, '').split('\n');
}

/**
 * Options of the shared status view.
 *
 * @private shared status view
 */
export type StatusViewOptions = {
    /** Operation outcome shown above the status (start/restart/stop). */
    readonly outcome?: { readonly title: string; readonly message?: string; readonly tone: PanelTone };
    /** Prepared QR (omitted with --no-qr/raw). */
    readonly qr?: PreparedQr;
    /** QR suppressed explicitly (`--no-qr`). */
    readonly noQr?: boolean;
    /** Pairing link for the trusted local terminal (pretty only; raw never prints it automatically). */
    readonly pairingUrl?: string;
    /** Next commands. */
    readonly next?: readonly string[];
    /** Live dashboard extras. */
    readonly live?: {
        readonly frame: number;
        readonly maxHeight: number;
        readonly legend: string;
        readonly input?: readonly string[];
        readonly activityOffset: number;
        readonly focusRequest: number;
        readonly connectionLost?: string;
        /** Expanded detail panels (viewer-local presentation state; initially collapsed). */
        readonly details?: { readonly execution: boolean; readonly browser: boolean; readonly sync?: boolean };
        /** A pending confirmation or action feedback shown in the service-controls panel. */
        readonly controlNote?: string;
        /** The panel holding keyboard focus (highlighted, never enlarged). */
        readonly focus?: DashboardPanel;
        /** The complete task inventory for the Tasks panel (smart current-work order). */
        readonly inventory?: readonly TaskInventoryItem[];
    };
};

/**
 * Human label of the remote state.
 */
function remoteLabel(snapshot: ServiceSnapshot): string {
    const remote = snapshot.connection.remote;
    switch (remote.state) {
        case 'disabled':
            return snapshot.connection.local.state === 'disabled' ? 'disabled (no HTTP server)' : 'disabled (local only)';
        case 'connecting':
            return `connecting via ${remote.provider ?? 'tunnel'}…`;
        case 'ready':
            return `ready via ${remote.provider ?? 'tunnel'}`;
        case 'degraded':
        case 'failed':
            return `degraded: ${remote.error ?? 'unavailable'}`;
    }
}

/**
 * Renders the snapshot as plain text sections (raw output: no color, borders, QR or pairing secrets).
 *
 * @private shared status view
 */
export function renderStatusRaw(snapshot: ServiceSnapshot, options: StatusViewOptions = {}): string {
    const lines: string[] = [];
    if (options.outcome) lines.push(`${options.outcome.title}${options.outcome.message ? `: ${options.outcome.message}` : ''}`, '');
    lines.push(`Project: ${snapshot.project.name} (${snapshot.project.path})`);
    lines.push(`Engine: ptbk ${snapshot.engine.version} (${snapshot.engine.scope} installation)`);
    lines.push(
        `Service: ${snapshot.service.mode}, ${snapshot.service.state}${snapshot.service.state !== 'stopped' ? `, PID ${snapshot.service.pid}` : ''}, ${snapshot.service.commitMode === 'commit' ? 'automatic commits' : 'NO-COMMIT mode (results stay uncommitted)'}${snapshot.service.persistent === null ? '' : snapshot.service.persistent ? ', persistent' : ', not persistent'}`,
    );
    lines.push(`Lifecycle: ${lifecycleSummary(snapshot)}`);
    const reasons = snapshot.service.pauseReasons ?? [];
    if (reasons.length) lines.push(`Pause reasons: ${pauseReasonLines(reasons).join(' · ')}`);
    if (snapshot.health) lines.push(`Health: ${healthOneLine(snapshot.health)}`);
    const actions = lifecycleActions(snapshot);
    if (actions.length) lines.push(`Controls: ${actions.map((action) => `${action.command} (${action.label})`).join(' · ')}`);
    if (snapshot.service.persistenceNote) lines.push(`Persistence: ${snapshot.service.persistenceNote}`);
    lines.push(`Observed: ${snapshot.observedAt} (snapshot)`, '');
    const waiting = snapshot.chats.waiting;
    lines.push(`NEEDS YOUR ATTENTION (${waiting.length})`);
    if (!waiting.length) lines.push('- nothing');
    for (const chat of waiting) {
        lines.push(`- ${chat.awaiting?.sender ?? chat.agent ?? 'An agent'} waits for you in the chat {${chat.name}}`);
        if (chat.awaiting) lines.push(`  ${chat.awaiting.text.replace(/\n/g, '\n  ')}`);
        if (chat.awaiting?.choices?.length) lines.push(`  Choices: ${chat.awaiting.choices.join(' | ')}`);
        if (chat.links.length) lines.push(`  Links: ${chat.links.join(', ')}`);
        lines.push(`  Answer: ptbk answer "${chat.name}" "<answer>" · discuss: ptbk chat --open "${chat.name}"`);
    }
    lines.push(`CHATS: ${snapshot.chats.total} total, ${snapshot.chats.unread} unread message(s), ${waiting.length} waiting for you (ptbk chat --list)`);
    lines.push('', 'CURRENT WORK');
    if (snapshot.current) {
        const current = snapshot.current;
        lines.push(`- ${current.agent.name} (${activityLabel(current.agent.activity)}) on "${current.taskTitle}" [${current.taskRef}]${current.kind !== 'task' ? ` (${current.kind})` : ''}`);
        if (snapshot.execution) lines.push(`  ${executionOneLine(snapshot.execution)}`);
        lines.push(`  Phase: ${current.phase}${current.attempt ? ` (attempt ${current.attempt}/${current.attemptBudget})` : ''}${current.detail ? `; ${current.detail}` : ''}`);
        if (current.trace) lines.push(`  Trace: ${current.trace}`);
    } else lines.push(`- ${snapshot.phase}${snapshot.wait ? `: ${snapshot.wait.reason}` : ''}`);
    if (snapshot.wait && snapshot.current) lines.push(`  Waiting: ${snapshot.wait.reason}${snapshot.wait.until ? ` (until ${snapshot.wait.until})` : ''}`);
    if (snapshot.wait?.action) lines.push(`  Next action: ${snapshot.wait.action}`);
    for (const blocker of snapshot.blockers) lines.push(`  BLOCKED: ${blocker.title}: ${blocker.reason}${blocker.action ? ` Action: ${blocker.action}` : ''}${blocker.recheckAt ? ` (recheck ${blocker.recheckAt})` : ''}`);
    lines.push('', `QUEUE (${snapshot.queueTotal})`);
    if (!snapshot.queue.length) lines.push('- no unfinished tasks');
    for (const item of snapshot.queue.slice(0, 20)) lines.push(`- [${item.readiness}] ${item.title} (${item.ref})${item.agent ? ` ${item.agent}` : ''} — ${item.reason}`);
    if (snapshot.queue.length > 20) lines.push(`- … ${snapshot.queue.length - 20} more (ptbk list)`);
    lines.push('', `RESULTS: ${snapshot.results.completed} completed, ${snapshot.results.failed} failed`);
    for (const result of snapshot.results.recent.slice(0, 5)) lines.push(`- ${result.outcome}: ${result.title}${result.commit ? ` (${result.commit.slice(0, 8)})` : ''}`);
    const error = snapshot.errors[snapshot.errors.length - 1];
    if (error) lines.push(`Last error: ${error.summary}${error.next ? ` Next: ${error.next}` : ''}${error.trace ? ` Diagnostics: ${error.trace}` : ''}`);
    if (snapshot.tools) {
        lines.push('', `TOOLS (${snapshot.tools.items.length})`);
        if (!snapshot.tools.items.length) lines.push('- none configured (ptbk tool add BROWSER … / ptbk tool add HARNESS …)');
        for (const item of snapshot.tools.items) lines.push(`- ${toolRow(item)}`, `    ${item.summary}${item.nextAction && item.state !== 'usable' ? ` → ${item.nextAction}` : ''}`);
        if (snapshot.tools.waiting) lines.push(`New work waits for tools: ${snapshot.tools.waiting.reason} Action: ${snapshot.tools.waiting.action}`);
        for (const problem of snapshot.tools.problems) lines.push(`Problem: ${problem}`);
    }
    if (snapshot.sync) lines.push('', 'SYNCHRONIZATION', ...syncDetailLines(snapshot.sync).slice(0, -1).map((line) => `  ${line}`));
    if (snapshot.health) lines.push('', 'HEALTH', ...healthDetailLines(snapshot.health).filter(Boolean).map((line) => `  ${line}`));
    if (snapshot.configuration?.pending) lines.push('', `CONFIGURATION: ${snapshot.configuration.pending}`);
    const execution = snapshot.phase === 'unknown' ? ['Unavailable: the service runs another ptbk version.'] : executionDetailLines(snapshot.execution);
    lines.push('', 'EXECUTION DETAILS', ...execution.map((line) => `  ${line}`));
    const browsers = snapshot.browsers?.length ? snapshot.browsers : snapshot.browser ? [snapshot.browser] : [];
    for (const browser of browsers) lines.push('', `BROWSER DETAILS${browsers.length > 1 ? ` · ${browser.name}` : ''}`, ...browserDetailLines(browser).map((line) => `  ${line}`));
    lines.push('', 'CONNECTION');
    const local = snapshot.connection.local;
    lines.push(`Local: ${local.state}${local.url ? ` ${local.url} (same computer only)` : ''}${local.error ? ` (${local.error})` : ''}`);
    lines.push(`Remote: ${remoteLabel(snapshot)}${snapshot.connection.remote.url ? ` ${snapshot.connection.remote.url}` : ''}`);
    if (snapshot.connection.pairing) lines.push(`Pairing: ${snapshot.connection.pairing.available ? 'a pairing link is available; print it with `ptbk access pair`' : 'none active; renew with `ptbk access pair --renew`'}`);
    if (options.next?.length) lines.push('', `Next: ${options.next.join(' · ')}`);
    return `${lines.join('\n')}\n`;
}

/**
 * Renders the snapshot as titled panels for a suitable terminal.
 *
 * @private shared status view
 */
export function renderStatusPretty(snapshot: ServiceSnapshot, terminal: TerminalProfile, options: StatusViewOptions = {}): string[] {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const total = Math.min(terminal.columns(), 140);
    const unicode = terminal.unicode;
    const frame = options.live?.frame ?? 0;
    const output: string[] = [];
    // The focused panel is highlighted in place (accent border and pointer), keeping the grid unchanged.
    const focused = (panel: DashboardPanel): boolean => options.live?.focus === panel;
    const titled = (panel: DashboardPanel, title: string): string => (focused(panel) ? `${marks.pointer} ${title}` : title);
    const toned = (panel: DashboardPanel, tone: PanelTone): PanelTone => (focused(panel) ? 'accent' : tone);
    const stateTone = (state: string): string => (state === 'running' ? style.success(state) : state === 'stopped' || state === 'finished' ? style.muted(state) : state === 'stopping' ? style.error(state) : style.warning(state));
    const headerRight = `ptbk ${snapshot.engine.version} · ${snapshot.service.mode} · ${snapshot.service.state}`;
    const headerLines = [
        `${style.bold(snapshot.project.name)}  ${style.muted(snapshot.project.path)}`,
        `${stateTone(snapshot.service.state)} · ${snapshot.service.commitMode === 'commit' ? 'commits automatically' : style.warning('NO-COMMIT mode: results stay uncommitted')}${snapshot.service.persistent === null ? '' : snapshot.service.persistent ? ' · persistent' : style.warning(' · not persistent')}${options.live ? (options.live.connectionLost ? style.error(` · disconnected: ${options.live.connectionLost}`) : style.muted(` · live, updated ${formatShortTime(Date.parse(snapshot.observedAt))}`)) : style.muted(` · snapshot at ${formatShortTime(Date.parse(snapshot.observedAt))}`)}`,
    ];
    if (options.outcome) {
        output.push(...renderPanel({ title: options.outcome.title, lines: options.outcome.message ? wrap(options.outcome.message, total - 4) : [], width: total, tone: options.outcome.tone, unicode, style }));
    }
    output.push(...renderPanel({ title: `${marks.bullet} Promptbook`, titleRight: headerRight, lines: headerLines, width: total, tone: 'accent', unicode, style }));

    // Attention: highest priority, full width.
    const attention: string[] = [];
    const waiting = snapshot.chats.waiting;
    waiting.forEach((chat, index) => {
        const focused = options.live && index === options.live.focusRequest;
        const marker = focused ? style.accent(marks.pointer) : style.warning(marks.warn);
        attention.push(`${marker} ${style.bold(chat.awaiting?.sender ?? chat.agent ?? 'An agent')} ${style.muted('waits for you in')} ${style.bold(`{${chat.name}}`)}${chat.unread ? style.accent(` · ${chat.unread} unread`) : ''}`);
        for (const line of wrap(chat.awaiting?.text ?? '', total - 8).slice(0, focused ? 8 : 2)) attention.push(`   ${line}`);
        if (chat.awaiting?.choices?.length) attention.push(`   ${style.muted('Choices:')} ${chat.awaiting.choices.map((choice, choiceIndex) => `${style.accent(`[${choiceIndex + 1}]`)} ${choice}`).join('  ')}`);
        attention.push(`   ${style.muted(options.live ? 'Press A to open the conversation' : `Answer: ptbk answer "${chat.name}"`)}${chat.links.length ? style.muted(` · ${chat.links.join(', ')}`) : ''}`);
    });
    if (options.live?.input) attention.push('', ...options.live.input);
    if (attention.length) output.push(...renderPanel({ title: titled('attention', `${marks.warn} Needs your attention (${waiting.length})`), titleRight: `${snapshot.chats.total} chats · ${snapshot.chats.unread} unread`, lines: attention, width: total, tone: waiting.length && !focused('attention') ? 'attention' : 'accent', unicode, style }));
    else output.push(style.muted(`  ${marks.ok} Nothing needs your attention.${snapshot.chats.total ? ` ${snapshot.chats.total} chat(s)${snapshot.chats.unread ? `, ${snapshot.chats.unread} unread message(s)` : ''}.` : ''}`));

    // Service controls: the engine's live state and its lifecycle actions are always visible (never inside details).
    // A live view offers keys; a snapshot names the equivalent commands (a stopped service only offers `ptbk start`).
    const controlActions = lifecycleActions(snapshot).filter((action) => !options.live || action.key);
    const controls = [
        ...wrap(`${snapshot.service.state} ${marks.dot} ${lifecycleExplanation(snapshot)}${snapshot.service.lifecycle?.since ? ` · since ${formatShortTime(Date.parse(snapshot.service.lifecycle.since))}` : ''}`, total - 4).map((line, index) =>
            index === 0 ? `${stateTone(snapshot.service.state)}${line.slice(snapshot.service.state.length)}` : line,
        ),
        ...(controlActions.length
            ? options.live
                ? flow(controlActions.map((action) => `${style.accent(action.key)} ${action.label}`), total - 4, style.muted('  ·  '))
                : flow(controlActions.map((action) => style.muted(`${action.command}${action.label && action.label !== action.command.replace(/^ptbk /, '') ? ` (${action.label})` : ''}`)), total - 4, style.muted('  ·  '))
            : [style.muted('No lifecycle action applies now.')]),
        ...(options.live?.controlNote ? [style.warning(options.live.controlNote)] : []),
        ...((snapshot.service.pauseReasons?.length ?? 0) > 1 || (snapshot.service.pauseReasons ?? []).some((reason) => reason.kind === 'health') ? pauseReasonLines(snapshot.service.pauseReasons!).map((line) => style.warning(`${marks.dot} ${line}`)) : []),
        ...(snapshot.health ? [`${style.muted('Health')} ${snapshot.health.status === 'ok' ? style.success(snapshot.health.summary) : snapshot.health.status === 'hard' ? style.error(snapshot.health.summary) : style.warning(snapshot.health.summary)}${style.muted(` · disk ${formatMiB(snapshot.health.disk.freeMiB)} free · memory ${formatMiB(snapshot.health.memory.availableMiB)} available`)}`] : []),
    ];
    output.push(...renderPanel({ title: titled('controls', 'Service controls'), titleRight: snapshot.service.mode, lines: controls, width: total, tone: toned('controls', snapshot.service.state === 'running' ? 'default' : 'attention'), unicode, style }));

    // Current work.
    const work: string[] = [];
    const current = snapshot.current;
    if (current) {
        const badgeLines = framedBadge(current.agent.name, current.agent.activity, style, unicode, terminal.reducedMotion ? 0 : frame);
        const info = [
            `${style.bold(current.agent.name)} ${style.muted(activityLabel(current.agent.activity))}`,
            truncate(current.taskTitle, 200),
            options.live
                ? style.muted(options.live.details?.execution ? 'Execution details below (E hides them)' : 'E: harness, model and thinking level of this run')
                : style.muted(snapshot.execution ? executionOneLine(snapshot.execution) : current.harnessName),
        ];
        for (let row = 0; row < 3; row++) work.push(`${badgeLines[row]}  ${info[row]}`);
        work.push(`${style.muted('Phase')} ${current.phase}${current.attempt ? ` · attempt ${current.attempt}/${current.attemptBudget}` : ''}${current.detail ? style.muted(` · ${current.detail}`) : ''}`);
        work.push(`${style.muted('Task ')} ${current.taskRef}${current.kind !== 'task' ? style.muted(` (${current.kind})`) : ''}${current.trace ? style.muted(` · trace ${current.trace}`) : ''}`);
    } else {
        work.push(snapshot.service.state === 'stopped' ? style.muted('The service is stopped.') : `${style.bold(snapshot.phase)}${snapshot.wait ? ` ${marks.dot} ${snapshot.wait.reason}` : ''}`);
    }
    if (snapshot.wait && current) work.push(`${style.warning(marks.wait)} ${snapshot.wait.reason}${snapshot.wait.until ? style.muted(` · until ${formatShortTime(Date.parse(snapshot.wait.until))}`) : ''}`);
    if (snapshot.wait && !current && snapshot.wait.until) work.push(style.muted(`Next opportunity ${formatShortTime(Date.parse(snapshot.wait.until))}${snapshot.wait.skippable ? ' · S skips this wait' : ''}`));
    if (snapshot.wait?.action) work.push(`${style.accent(marks.arrow)} ${snapshot.wait.action}`);
    for (const blocker of snapshot.blockers) {
        work.push(`${style.error(marks.fail)} ${style.bold(blocker.title)}: ${blocker.reason}`);
        if (blocker.action) work.push(`  ${style.accent(marks.arrow)} ${blocker.action}${blocker.recheckAt ? style.muted(` · recheck ${formatShortTime(Date.parse(blocker.recheckAt))}`) : ''}`);
    }
    const lastError = snapshot.errors[snapshot.errors.length - 1];
    if (lastError) work.push(style.error(`Last error: ${lastError.summary}`), ...(lastError.next ? [style.muted(`  Next: ${lastError.next}`)] : []));
    // A significant browser failure stays visible while the browser panel is collapsed.
    const browser = snapshot.browser;
    for (const failing of (snapshot.browsers?.length ? snapshot.browsers : browser ? [browser] : []).filter((item) => (item.state === 'failed' || item.recovery?.state === 'blocked') && item.lastFailure)) {
        work.push(`${style.error(marks.fail)} ${style.bold(`Browser ${failing.name}`)}: ${failing.lastFailure!.summary}${failing.recovery?.state === 'retrying' ? style.muted(' · recovering automatically') : ''}${options.live ? style.muted(' · B/T details') : ''}`);
    }

    // Agents, Chats and Tasks: three separate inventories (not three labels of the active task).
    const readinessTone = (readiness: string): ((text: string) => string) =>
        readiness === 'ready' || readiness === 'active' ? style.success : ['blocked', 'failed', 'needs-recovery', 'incompatible'].includes(readiness) ? style.error : readiness === 'awaiting-user' || readiness.includes('assign') ? style.warning : style.muted;
    const taskItems: TaskInventoryItem[] = options.live?.inventory
        ? smartTaskOrder(options.live.inventory, Date.parse(snapshot.observedAt))
        : snapshot.queue.map((item) => ({ ref: item.ref, title: item.title, readiness: item.readiness, reason: item.reason, priority: item.priority, agent: item.agent, until: item.until, source: item.source, doneCount: 0 }));
    const queuedBy = (agent: string): number => taskItems.filter((item) => item.agent && item.agent.replace(/^@|^\{|\}$/g, '').toLowerCase() === agent.toLowerCase() && !['done', 'retired'].includes(item.readiness)).length;
    const panelLimit = options.live ? 6 : 8;
    const agentLines = (inner: number): string[] => {
        const lines = snapshot.agents.slice(0, panelLimit).map((agent) => {
            const queued = queuedBy(agent.name);
            return truncate(`${inlineBadge(agent.name, agent.activity, style)} ${style.muted(activityLabel(agent.activity))}${queued ? style.muted(` · ${queued} queued`) : ''}`, inner);
        });
        if (!lines.length) lines.push(style.muted('No agents are loaded.'));
        if (snapshot.agents.length > panelLimit) lines.push(style.muted(`… ${snapshot.agents.length - panelLimit} more`));
        if (options.live) lines.push(style.muted(focused('agents') ? 'Enter: every agent, queues, chat and Book' : 'Expert is engine-provided'));
        return lines;
    };
    const chatLines = (inner: number): string[] => {
        const lines = snapshot.chats.recent.slice(0, panelLimit).map((chat) => truncate(`${chat.status === 'waiting-for-user' ? style.warning(`${marks.warn} `) : ''}${chat.name}${chat.unread ? style.accent(` · ${chat.unread} unread`) : ''}`, inner));
        if (!lines.length) lines.push(style.muted('No chats yet.'));
        if (snapshot.chats.total > panelLimit) lines.push(style.muted(`… ${snapshot.chats.total - Math.min(panelLimit, snapshot.chats.recent.length)} more`));
        if (options.live) lines.push(style.muted(focused('chats') ? 'Enter: all chats · N new (Chatter first)' : 'C new chat (Chatter first)'));
        return lines;
    };
    const taskLines = (inner: number): string[] => {
        const lines: string[] = [];
        for (const item of taskItems.slice(0, panelLimit)) {
            lines.push(truncate(`${readinessTone(item.readiness)(item.readiness.padEnd(12).slice(0, 12))} ${item.title}`, inner));
        }
        if (!taskItems.length) lines.push(style.muted('No tasks.'));
        if (taskItems.length > panelLimit) lines.push(style.muted(`… ${taskItems.length - panelLimit} more${options.live ? '' : ' (ptbk list)'}`));
        if (options.live) lines.push(style.muted(focused('tasks') ? 'Enter: all tasks, sorting · T talk to Tasker' : 'smart order: now, soon, recent'));
        return lines;
    };
    const inventoryPanels = (width: number): string[] => {
        const agentsTitle = titled('agents', `Agents (${snapshot.agents.length})`);
        const chatsTitle = titled('chats', `Chats (${snapshot.chats.total})`);
        const tasksTitle = titled('tasks', `Tasks (${options.live?.inventory ? taskItems.length : snapshot.queueTotal})`);
        if (width < 100) {
            return [
                ...renderPanel({ title: agentsTitle, lines: agentLines(width - 4), width, tone: toned('agents', 'default'), unicode, style }),
                ...renderPanel({ title: chatsTitle, lines: chatLines(width - 4), width, tone: toned('chats', snapshot.chats.waiting.length ? 'attention' : 'default'), unicode, style }),
                ...renderPanel({ title: tasksTitle, lines: taskLines(width - 4), width, tone: toned('tasks', 'default'), unicode, style }),
            ];
        }
        const third = Math.floor((width - 2) / 3);
        const widths = [third, third, width - 2 - third * 2];
        const columns = [agentLines(widths[0]! - 4), chatLines(widths[1]! - 4), taskLines(widths[2]! - 4)];
        const height = Math.max(...columns.map((column) => column.length));
        return sideBySide(
            [
                renderPanel({ title: agentsTitle, lines: columns[0]!, width: widths[0]!, tone: toned('agents', 'default'), unicode, style, minHeight: height }),
                renderPanel({ title: chatsTitle, lines: columns[1]!, width: widths[1]!, tone: toned('chats', snapshot.chats.waiting.length ? 'attention' : 'default'), unicode, style, minHeight: height }),
                renderPanel({ title: tasksTitle, lines: columns[2]!, width: widths[2]!, tone: toned('tasks', 'default'), unicode, style, minHeight: height }),
            ],
            widths,
        );
    };

    // Results and activity.
    const results: string[] = [`${style.muted('This session:')} ${style.success(`${marks.ok} ${snapshot.results.completed} completed`)}  ${snapshot.results.failed ? style.error(`${marks.fail} ${snapshot.results.failed} failed`) : style.muted(`${marks.fail} 0 failed`)}`];
    if (snapshot.results.recent.length) results.push(style.muted('Recent results:'));
    for (const result of snapshot.results.recent.slice(0, 3)) {
        results.push(`${result.outcome.startsWith('completed') ? style.success(marks.ok) : result.outcome === 'failed' ? style.error(marks.fail) : style.warning(marks.wait)} ${result.title}${result.commit ? style.muted(` ${result.commit.slice(0, 8)}`) : ''}`);
    }
    const activityCount = options.live ? Math.max(3, Math.min(10, options.live.maxHeight - 30)) : 5;
    const activitySource = snapshot.activity.slice(0, snapshot.activity.length - (options.live?.activityOffset ?? 0)).slice(-activityCount);
    if (activitySource.length) results.push(style.muted('Activity:'));
    for (const line of activitySource) {
        const colored = line.level === 'error' ? style.error : line.level === 'warning' ? style.warning : (text: string): string => text;
        results.push(`${style.muted(formatShortTime(Date.parse(line.at)))} ${colored(line.text)}`);
    }
    if (options.live?.activityOffset) results.push(style.muted(`↓ ${options.live.activityOffset} newer (End follows)`));

    // Connection (built per column width so that links wrap instead of being clipped).
    const connectionLines = (inner: number): string[] => {
        const breakLink = (link: string, indent = ''): string[] => {
            const chunks: string[] = [];
            const room = Math.max(10, inner - indent.length);
            for (let index = 0; index < link.length; index += room) chunks.push(`${indent}${link.slice(index, index + room)}`);
            return chunks;
        };
        const lines: string[] = [];
        const local = snapshot.connection.local;
        const remote = snapshot.connection.remote;
        if (remote.state === 'ready' && remote.url) lines.push(`${style.success('Remote')} ${style.muted(`ready via ${remote.provider}; relay sees traffic`)}`, ...breakLink(remote.url, '  ').map((line) => style.bold(line)));
        else lines.push(`${remote.state === 'disabled' ? style.muted('Remote') : style.warning('Remote')} ${remoteLabel(snapshot)}`);
        if (local.url) lines.push(`${local.state === 'ready' ? style.success('Local') : style.muted('Local')} ${style.muted('(this computer only)')}`, ...breakLink(local.url, '  '));
        else lines.push(`${style.muted('Local')} ${local.state}${local.error ? `: ${local.error}` : ''}`);
        if (options.qr) {
            lines.push('', style.muted(options.qr.label), ...options.qr.lines);
            if (options.qr.sensitive) lines.push(style.warning('Single-use pairing code, valid 10 min.'), style.warning('Do not share it.'));
        } else if (options.noQr) lines.push(style.muted('QR hidden (--no-qr).'));
        if (options.pairingUrl) lines.push(style.muted(remote.state === 'ready' ? 'Pairing link (secret, single use):' : 'Pairing link (this computer only):'), ...breakLink(options.pairingUrl, '  '));
        else if (snapshot.connection.pairing && !snapshot.connection.pairing.available && local.state === 'ready') lines.push(style.muted('No active pairing link'), style.muted('  ptbk access pair --renew'));
        return lines;
    };

    // Compact tools overview (always) and synchronization status (only while autosync is enabled).
    const toolsPanel = (width: number): string[] =>
        renderPanel({ title: titled('tools', 'Tools'), titleRight: snapshot.tools ? `${snapshot.tools.items.filter((item) => item.state === 'usable').length} usable` : undefined, lines: toolsCompactLines(snapshot.tools, style, { live: Boolean(options.live) }), width, tone: toned('tools', snapshot.tools?.waiting ? 'attention' : 'default'), unicode, style });
    const syncPanel = (width: number): string[] =>
        snapshot.sync ? renderPanel({ title: titled('sync', 'Synchronization'), titleRight: 'Git', lines: syncCompactLines(snapshot.sync, style, { live: Boolean(options.live) }), width, tone: toned('sync', ['failed', 'conflict'].includes(snapshot.sync.state) ? 'attention' : 'default'), unicode, style }) : [];

    // Expandable detail panels (live dashboard only; initially collapsed, opened with E, B and Y).
    const detailPanels = (): string[] => {
        const panels: string[] = [];
        const details = options.live?.details;
        if (details?.execution) panels.push(...renderPanel({ title: 'Execution details', titleRight: 'E hides', lines: executionDetailLines(snapshot.execution, style), width: total, unicode, style }));
        if (details?.browser) panels.push(...renderPanel({ title: `Browser details${snapshot.browser ? ` · ${snapshot.browser.name}` : ''}`, titleRight: 'B hides', lines: browserDetailLines(snapshot.browser, style, { keys: true }), width: total, unicode, style }));
        if (details?.sync && snapshot.sync) panels.push(...renderPanel({ title: 'Synchronization details', titleRight: 'Y hides', lines: syncDetailLines(snapshot.sync, style), width: total, unicode, style }));
        return panels;
    };

    const twoColumns = total >= 100;
    if (twoColumns) {
        const qrWidth = options.qr ? Math.max(...options.qr.lines.map((line) => stringWidth(line))) + 4 : 0;
        const rightWidth = Math.max(Math.round(total * 0.38), Math.min(qrWidth, Math.round(total * 0.5)));
        const leftWidth = total - rightWidth - 1;
        const left = [...renderPanel({ title: titled('work', 'Current work'), lines: work, width: leftWidth, tone: current || focused('work') ? 'accent' : 'default', unicode, style }), ...toolsPanel(leftWidth)];
        const sync = syncPanel(rightWidth);
        const right = [...sync, ...renderPanel({ title: titled('connection', 'Connection'), lines: connectionLines(rightWidth - 4), width: rightWidth, tone: toned('connection', 'default'), unicode, style, minHeight: Math.max(0, left.length - 2 - sync.length) })];
        output.push(...sideBySide([left, right], [leftWidth, rightWidth]));
        output.push(...inventoryPanels(total));
        output.push(...detailPanels());
        output.push(...renderPanel({ title: titled('results', 'Results and activity'), lines: results, width: total, tone: toned('results', 'default'), unicode, style }));
    } else {
        output.push(...renderPanel({ title: titled('work', 'Current work'), lines: work, width: total, tone: current || focused('work') ? 'accent' : 'default', unicode, style }));
        output.push(...toolsPanel(total));
        output.push(...syncPanel(total));
        output.push(...detailPanels());
        output.push(...inventoryPanels(total));
        output.push(...renderPanel({ title: titled('results', 'Results and activity'), lines: results, width: total, tone: toned('results', 'default'), unicode, style }));
        const qrTooWide = options.qr && Math.max(...options.qr.lines.map((line) => stringWidth(line))) > total - 4;
        const connection = connectionLines(total - 4);
        output.push(...renderPanel({ title: titled('connection', 'Connection'), lines: qrTooWide ? [...connection.filter((line) => !options.qr!.lines.includes(line)), style.warning('The terminal is too narrow for a scannable QR code; use the link above.')] : connection, width: total, tone: toned('connection', 'default'), unicode, style }));
    }
    if (options.live) output.push(style.muted(options.live.legend));
    else if (options.next?.length) output.push(style.muted(`  Next: ${options.next.join(' · ')}`));
    return output;
}

/**
 * Renders the snapshot in the invocation's presentation.
 *
 * @private shared status view
 */
export function renderStatus(snapshot: ServiceSnapshot, terminal: TerminalProfile, options: StatusViewOptions = {}): string {
    if (!terminal.pretty) return renderStatusRaw(snapshot, options);
    return `${renderStatusPretty(snapshot, terminal, options).join('\n')}\n`;
}
