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
import type { TaskInventoryItem } from '../tasks/views.js';
import { briefRecoveryParts, browserDetailLines, executionDetailLines, executionOneLine, healthDetailLines, healthOneLine, lifecycleActions, lifecycleExplanation, lifecycleSummary, pauseReasonLines, syncCompactLines, syncDetailLines, toolRow, toolsCompactLines } from './details.js';
import { renderPanel, sideBySide, type PanelTone } from './panels.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * Widest one-shot snapshot.
 */
const MAX_SNAPSHOT_WIDTH = 140;

/**
 * Width from which the snapshot places panels side by side.
 */
const WIDE_SNAPSHOT = 100;

/**
 * Share of a wide snapshot taken by the connection column.
 */
const CONNECTION_SHARE = 0.38;

/**
 * Items listed per inventory panel of a snapshot.
 */
const PANEL_ITEMS = 8;

/**
 * Column width of task readiness in a snapshot.
 */
const READINESS_WIDTH = 12;

/**
 * Recent results and activity lines in a snapshot.
 */
const RECENT_RESULTS = 3;
const RECENT_ACTIVITY = 5;

/**
 * Options of the shared status view.
 *
 * @private shared status view
 */
export type StatusViewOptions = {
    /** Operation outcome shown above the status (start/restart/stop). */
    readonly outcome?: { readonly title: string; readonly message?: string; readonly tone: PanelTone };
    /** Next commands. */
    readonly next?: readonly string[];
};

/**
 * The saved brief in one line, or an honest explanation of its absence (never fabricated).
 *
 * @private shared status view
 */
export function briefLine(snapshot: Pick<ServiceSnapshot, 'report'>): string {
    const report = snapshot.report;
    if (!report) return 'not reported by this engine.';
    const state = [report.generating ? 'a new brief is being written' : '', report.requestedAt && !report.generating ? `a refresh is requested${report.waiting ? ` (${report.waiting})` : ''}` : '', ...briefRecoveryParts(report, true)].filter(Boolean).join('; ');
    if (report.brief) return `${report.brief.text.replace(/\s+/g, ' ')} (${report.brief.at}${state ? `; ${state}` : ''})`;
    if (report.state === 'unreadable') return `report.book cannot be read: ${report.problem ?? 'unknown problem'}.`;
    return `no brief yet${state ? ` (${state})` : ' (Chatter writes the first one once there is work to report)'}.`;
}

/**
 * Renders the snapshot as plain text sections (raw output: no color or borders).
 *
 * @private shared status view
 */
export function renderStatusRaw(snapshot: ServiceSnapshot, options: StatusViewOptions = {}): string {
    const lines: string[] = [];
    if (options.outcome) lines.push(`${options.outcome.title}${options.outcome.message ? `: ${options.outcome.message}` : ''}`, '');
    lines.push(`Project: ${snapshot.project.name} (${snapshot.project.path})`);
    lines.push(`Brief: ${briefLine(snapshot)}`);
    lines.push(`Engine: ptbk ${snapshot.engine.version} (${snapshot.engine.scope} installation)`);
    lines.push(
        `Service: ${snapshot.service.mode}, ${snapshot.service.state}${snapshot.service.state !== 'stopped' ? `, PID ${snapshot.service.pid}` : ''}, ${snapshot.service.commitMode === 'commit' ? 'automatic commits' : 'NO-COMMIT mode (results stay uncommitted)'}${snapshot.service.persistent === null ? '' : snapshot.service.persistent ? ', persistent' : ', not persistent'}`,
    );
    lines.push(`Lifecycle: ${lifecycleSummary(snapshot)}`);
    const reasons = snapshot.service.pauseReasons ?? [];
    if (reasons.length) lines.push(`Pause reasons: ${pauseReasonLines(reasons).join(' · ')}`);
    if (snapshot.health) lines.push(`Health: ${healthOneLine(snapshot.health)}`);
    if (snapshot.wallet) lines.push(`Wallet: ${snapshot.wallet.summary}${snapshot.wallet.problem ? ` — ${snapshot.wallet.problem}` : ''}`);
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
    const active = snapshot.active ?? (snapshot.current ? [snapshot.current] : []);
    lines.push('', `CURRENT WORK${snapshot.capacity ? ` (${snapshot.capacity.active}/${snapshot.capacity.limit} active, ${snapshot.capacity.waiting} waiting, ${snapshot.capacity.queued} queued)` : ''}`);
    for (const current of active) {
        if (current.kind === 'chat') {
            lines.push(`- chat reply in {${current.taskTitle}}`);
            continue;
        }
        lines.push(`- ${current.agent.name} (${activityLabel(current.agent.activity)}) on "${current.taskTitle}" [${current.taskRef}]${current.kind !== 'task' ? ` (${current.kind})` : ''}`);
        const execution = snapshot.executions?.find((candidate) => candidate.task.ref === current.taskRef) ?? (current === active[0] ? snapshot.execution : undefined);
        if (execution) lines.push(`  ${executionOneLine(execution)}`);
        lines.push(`  Phase: ${current.phase}${current.attempt ? ` (attempt ${current.attempt}/${current.attemptBudget})` : ''}${current.detail ? `; ${current.detail}` : ''}`);
        if (current.files?.length) lines.push(`  Files: ${current.files.join(', ')}`);
        if (current.wait) lines.push(`  Waiting: ${current.wait.reason}${current.wait.until ? ` (until ${current.wait.until})` : ''}`);
        if (current.trace) lines.push(`  Trace: ${current.trace}`);
    }
    if (!active.length) lines.push(`- ${snapshot.phase}${snapshot.wait ? `: ${snapshot.wait.reason}` : ''}`);
    if (snapshot.wait && active.length) lines.push(`  Waiting: ${snapshot.wait.reason}${snapshot.wait.until ? ` (until ${snapshot.wait.until})` : ''}`);
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
    if (snapshot.wallet?.pending.length) lines.push('', 'WALLET LOGIN REQUESTS (add them on the Wallet page of the dashboard)', ...snapshot.wallet.pending.map((action) => `  - ${action.origin}${action.account ? ` (${action.account})` : ''}: ${action.problem === 'rejected' ? 'the saved login was rejected' : action.problem === 'locked' ? 'the Wallet must be restored first' : 'no saved login'}${action.tasks.length ? ` · for ${action.tasks.join(', ')}` : ''}`));
    if (snapshot.configuration?.pending) lines.push('', `CONFIGURATION: ${snapshot.configuration.pending}`);
    const execution = snapshot.phase === 'unknown' ? ['Unavailable: the service runs another ptbk version.'] : executionDetailLines(snapshot.execution);
    lines.push('', 'EXECUTION DETAILS', ...execution.map((line) => `  ${line}`));
    const browsers = snapshot.browsers?.length ? snapshot.browsers : snapshot.browser ? [snapshot.browser] : [];
    for (const browser of browsers) lines.push('', `BROWSER DETAILS${browsers.length > 1 ? ` · ${browser.name}` : ''}`, ...browserDetailLines(browser).map((line) => `  ${line}`));
    lines.push('', 'CONNECTION');
    const local = snapshot.connection.local;
    lines.push(`Local: ${local.state}${local.url ? ` ${local.url} (same computer only)` : ''}${local.error ? ` (${local.error})` : ''}`);
    if (options.next?.length) lines.push('', `Next: ${options.next.join(' · ')}`);
    return `${lines.join('\n')}\n`;
}

/**
 * Renders a one-shot snapshot as titled panels for a suitable terminal (the live dashboard renders its home screen and
 * pages instead).
 *
 * @private shared status view
 */
export function renderStatusPretty(snapshot: ServiceSnapshot, terminal: TerminalProfile, options: StatusViewOptions = {}): string[] {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const total = Math.min(terminal.columns(), MAX_SNAPSHOT_WIDTH);
    const unicode = terminal.unicode;
    const output: string[] = [];
    const stateTone = (state: string): string => (state === 'running' ? style.success(state) : state === 'stopped' || state === 'finished' ? style.muted(state) : state === 'stopping' ? style.error(state) : style.warning(state));
    const headerRight = `ptbk ${snapshot.engine.version} · ${snapshot.service.mode} · ${snapshot.service.state}`;
    const headerLines = [
        `${style.bold(snapshot.project.name)}  ${style.muted(snapshot.project.path)}`,
        `${stateTone(snapshot.service.state)} · ${snapshot.service.commitMode === 'commit' ? 'commits automatically' : style.warning('NO-COMMIT mode: results stay uncommitted')}${snapshot.service.persistent === null ? '' : snapshot.service.persistent ? ' · persistent' : style.warning(' · not persistent')}${style.muted(` · snapshot at ${formatShortTime(Date.parse(snapshot.observedAt))}`)}`,
    ];
    if (options.outcome) {
        output.push(...renderPanel({ title: options.outcome.title, lines: options.outcome.message ? wrap(options.outcome.message, total - 4) : [], width: total, tone: options.outcome.tone, unicode, style }));
    }
    output.push(...renderPanel({ title: `${marks.bullet} Promptbook`, titleRight: headerRight, lines: headerLines, width: total, tone: 'accent', unicode, style }));
    // Chatter's saved brief, prominently and once (reading it never generates one).
    const brief = snapshot.report?.brief;
    output.push(
        ...renderPanel({
            title: 'Project brief',
            titleRight: brief ? `${formatShortTime(Date.parse(brief.at))}${snapshot.report?.generating ? ' · updating' : ''}` : undefined,
            lines: brief ? [...wrap(brief.text, total - 4), ...briefRecoveryParts(snapshot.report!, true).flatMap((part) => wrap(style.muted(part), total - 4))] : [style.muted(briefLine(snapshot))],
            width: total,
            unicode,
            style,
        }),
    );

    // Attention: chats awaiting the user first, with their real authors.
    const attention: string[] = [];
    const waiting = snapshot.chats.waiting;
    for (const chat of waiting) {
        attention.push(`${style.warning(marks.warn)} ${style.bold(chat.awaiting?.sender ?? chat.agent ?? 'An agent')} ${style.muted('waits for you in')} ${style.bold(`{${chat.name}}`)}${chat.unread ? style.accent(` · ${chat.unread} unread`) : ''}`);
        for (const line of wrap(chat.awaiting?.text ?? '', total - 8).slice(0, 2)) attention.push(`   ${line}`);
        if (chat.awaiting?.choices?.length) attention.push(`   ${style.muted('Choices:')} ${chat.awaiting.choices.map((choice, choiceIndex) => `${style.accent(`[${choiceIndex + 1}]`)} ${choice}`).join('  ')}`);
        attention.push(`   ${style.muted(`Answer: ptbk answer "${chat.name}"`)}${chat.links.length ? style.muted(` · ${chat.links.join(', ')}`) : ''}`);
    }
    if (attention.length) output.push(...renderPanel({ title: `${marks.warn} Needs your attention (${waiting.length})`, titleRight: `${snapshot.chats.total} chats · ${snapshot.chats.unread} unread`, lines: attention, width: total, tone: 'attention', unicode, style }));
    else output.push(style.muted(`  ${marks.ok} Nothing needs your attention.${snapshot.chats.total ? ` ${snapshot.chats.total} chat(s)${snapshot.chats.unread ? `, ${snapshot.chats.unread} unread message(s)` : ''}.` : ''}`));

    // System: the live state, every pause reason, compact health and the equivalent lifecycle commands.
    const controlActions = lifecycleActions(snapshot);
    const reasons = snapshot.service.pauseReasons ?? [];
    const health = snapshot.health;
    const controls = [
        ...wrap(`${snapshot.service.state} ${marks.dot} ${lifecycleExplanation(snapshot)}${snapshot.service.lifecycle?.since ? ` · since ${formatShortTime(Date.parse(snapshot.service.lifecycle.since))}` : ''}`, total - 4).map((line, index) =>
            index === 0 ? `${stateTone(snapshot.service.state)}${line.slice(snapshot.service.state.length)}` : line,
        ),
        ...(reasons.length > 1 || reasons.some((reason) => reason.kind === 'health') ? pauseReasonLines(reasons).map((line) => style.warning(`${marks.dot} ${line}`)) : []),
        ...(health ? [`${style.muted('Health')} ${health.status === 'ok' ? style.success(health.summary) : health.status === 'hard' ? style.error(health.summary) : style.warning(health.summary)}${style.muted(` · disk ${formatMiB(health.disk.freeMiB)} free · memory ${formatMiB(health.memory.availableMiB)} available`)}`] : []),
        ...(controlActions.length ? flow(controlActions.map((action) => style.muted(`${action.command}${action.label && action.label !== action.command.replace(/^ptbk /, '') ? ` (${action.label})` : ''}`)), total - 4, style.muted('  ·  ')) : [style.muted('No lifecycle action applies now.')]),
    ];
    output.push(...renderPanel({ title: 'System', titleRight: snapshot.service.mode, lines: controls, width: total, tone: snapshot.service.state === 'running' ? 'default' : 'attention', unicode, style }));

    // Current work.
    const work: string[] = [];
    const active = snapshot.active ?? (snapshot.current ? [snapshot.current] : []);
    const current = active.find((item) => item.kind !== 'chat');
    if (current) {
        const badgeLines = framedBadge(current.agent.name, current.agent.activity, style, unicode, 0);
        const info = [`${style.bold(current.agent.name)} ${style.muted(activityLabel(current.agent.activity))}`, truncate(current.taskTitle, 200), style.muted(snapshot.execution ? executionOneLine(snapshot.execution) : current.harnessName)];
        for (let row = 0; row < 3; row++) work.push(`${badgeLines[row]}  ${info[row]}`);
        work.push(`${style.muted('Phase')} ${current.phase}${current.attempt ? ` · attempt ${current.attempt}/${current.attemptBudget}` : ''}${current.detail ? style.muted(` · ${current.detail}`) : ''}`);
        work.push(`${style.muted('Task ')} ${current.taskRef}${current.kind !== 'task' ? style.muted(` (${current.kind})`) : ''}${current.trace ? style.muted(` · trace ${current.trace}`) : ''}`);
        // Further concurrent work, one line each.
        for (const other of active.filter((item) => item !== current)) work.push(`${style.muted('Also ')} ${other.kind === 'chat' ? `chat reply in {${other.taskTitle}}` : `${other.agent.name} on ${truncate(other.taskTitle, 120)} ${style.muted(`(${other.phase})`)}`}`);
        if (snapshot.capacity) work.push(style.muted(`${snapshot.capacity.active}/${snapshot.capacity.limit} active · ${snapshot.capacity.waiting} waiting · ${snapshot.capacity.queued} queued`));
    } else {
        work.push(snapshot.service.state === 'stopped' ? style.muted('The service is stopped.') : `${style.bold(snapshot.phase)}${snapshot.wait ? ` ${marks.dot} ${snapshot.wait.reason}` : ''}`);
    }
    if (snapshot.wait && current) work.push(`${style.warning(marks.wait)} ${snapshot.wait.reason}${snapshot.wait.until ? style.muted(` · until ${formatShortTime(Date.parse(snapshot.wait.until))}`) : ''}`);
    if (snapshot.wait && !current && snapshot.wait.until) work.push(style.muted(`Next opportunity ${formatShortTime(Date.parse(snapshot.wait.until))}`));
    if (snapshot.wait?.action) work.push(`${style.accent(marks.arrow)} ${snapshot.wait.action}`);
    for (const blocker of snapshot.blockers) {
        work.push(`${style.error(marks.fail)} ${style.bold(blocker.title)}: ${blocker.reason}`);
        if (blocker.action) work.push(`  ${style.accent(marks.arrow)} ${blocker.action}${blocker.recheckAt ? style.muted(` · recheck ${formatShortTime(Date.parse(blocker.recheckAt))}`) : ''}`);
    }
    const lastError = snapshot.errors[snapshot.errors.length - 1];
    if (lastError) work.push(style.error(`Last error: ${lastError.summary}`), ...(lastError.next ? [style.muted(`  Next: ${lastError.next}`)] : []));
    for (const failing of (snapshot.browsers?.length ? snapshot.browsers : snapshot.browser ? [snapshot.browser] : []).filter((item) => (item.state === 'failed' || item.recovery?.state === 'blocked') && item.lastFailure)) {
        work.push(`${style.error(marks.fail)} ${style.bold(`Browser ${failing.name}`)}: ${failing.lastFailure!.summary}${failing.recovery?.state === 'retrying' ? style.muted(' · recovering automatically') : ''}`);
    }

    // Agents, Chats and Tasks: three separate inventories (not three labels of the active task).
    const readinessTone = (readiness: string): ((text: string) => string) =>
        readiness === 'ready' || readiness === 'active' ? style.success : ['blocked', 'failed', 'needs-recovery', 'incompatible'].includes(readiness) ? style.error : readiness === 'awaiting-user' || readiness.includes('assign') ? style.warning : style.muted;
    const taskItems: TaskInventoryItem[] = snapshot.queue.map((item) => ({ ref: item.ref, title: item.title, readiness: item.readiness, reason: item.reason, priority: item.priority, agent: item.agent, until: item.until, source: item.source, doneCount: 0, ...(item.kind ? { kind: item.kind, executor: item.executor } : {}) }));
    const queuedBy = (agent: string): number => taskItems.filter((item) => item.agent && item.agent.replace(/^@|^\{|\}$/g, '').toLowerCase() === agent.toLowerCase() && !['done', 'retired'].includes(item.readiness)).length;
    const agentLines = (inner: number): string[] => {
        const lines = snapshot.agents.slice(0, PANEL_ITEMS).map((agent) => {
            const queued = queuedBy(agent.name);
            return truncate(`${inlineBadge(agent.name, agent.activity, style)} ${style.muted(activityLabel(agent.activity))}${queued ? style.muted(` · ${queued} queued`) : ''}`, inner);
        });
        if (!lines.length) lines.push(style.muted('No agents are loaded.'));
        if (snapshot.agents.length > PANEL_ITEMS) lines.push(style.muted(`… ${snapshot.agents.length - PANEL_ITEMS} more`));
        return lines;
    };
    const chatLines = (inner: number): string[] => {
        const lines = snapshot.chats.recent.slice(0, PANEL_ITEMS).map((chat) => truncate(`${chat.status === 'waiting-for-user' ? style.warning(`${marks.warn} `) : ''}${chat.name}${chat.unread ? style.accent(` · ${chat.unread} unread`) : ''}`, inner));
        if (!lines.length) lines.push(style.muted('No chats yet.'));
        if (snapshot.chats.total > PANEL_ITEMS) lines.push(style.muted(`… ${snapshot.chats.total - Math.min(PANEL_ITEMS, snapshot.chats.recent.length)} more`));
        return lines;
    };
    const taskLines = (inner: number): string[] => {
        const lines = taskItems.slice(0, PANEL_ITEMS).map((item) => truncate(`${readinessTone(item.readiness)(item.readiness.padEnd(READINESS_WIDTH).slice(0, READINESS_WIDTH))} ${item.kind === 'system' ? style.muted('[system] ') : ''}${item.title}`, inner));
        if (!taskItems.length) lines.push(style.muted('No tasks.'));
        if (taskItems.length > PANEL_ITEMS) lines.push(style.muted(`… ${taskItems.length - PANEL_ITEMS} more (ptbk list)`));
        return lines;
    };
    const inventoryPanels = (width: number): string[] => {
        const titles = [`Agents (${snapshot.agents.length})`, `Chats (${snapshot.chats.total})`, `Tasks (${snapshot.queueTotal})`];
        const builders = [agentLines, chatLines, taskLines];
        const tones: PanelTone[] = ['default', snapshot.chats.waiting.length ? 'attention' : 'default', 'default'];
        if (width < WIDE_SNAPSHOT) return builders.flatMap((build, index) => renderPanel({ title: titles[index]!, lines: build(width - 4), width, tone: tones[index], unicode, style }));
        const third = Math.floor((width - 2) / 3);
        const widths = [third, third, width - 2 - third * 2];
        const columns = builders.map((build, index) => build(widths[index]! - 4));
        const height = Math.max(...columns.map((column) => column.length));
        return sideBySide(
            columns.map((lines, index) => renderPanel({ title: titles[index]!, lines, width: widths[index]!, tone: tones[index], unicode, style, minHeight: height })),
            widths,
        );
    };

    // Results.
    const results: string[] = [`${style.muted('This session:')} ${style.success(`${marks.ok} ${snapshot.results.completed} completed`)}  ${snapshot.results.failed ? style.error(`${marks.fail} ${snapshot.results.failed} failed`) : style.muted(`${marks.fail} 0 failed`)}`];
    for (const result of snapshot.results.recent.slice(0, RECENT_RESULTS)) {
        results.push(`${result.outcome.startsWith('completed') ? style.success(marks.ok) : result.outcome === 'failed' ? style.error(marks.fail) : style.warning(marks.wait)} ${result.title}${result.commit ? style.muted(` ${result.commit.slice(0, 8)}`) : ''}`);
    }
    const activity = snapshot.activity.slice(-RECENT_ACTIVITY);
    if (activity.length) results.push(style.muted('Activity:'));
    for (const line of activity) {
        const colored = line.level === 'error' ? style.error : line.level === 'warning' ? style.warning : (text: string): string => text;
        results.push(`${style.muted(formatShortTime(Date.parse(line.at)))} ${colored(line.text)}`);
    }

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
        if (local.url) lines.push(`${local.state === 'ready' ? style.success('Local') : style.muted('Local')} ${style.muted('(this computer only)')}`, ...breakLink(local.url, '  '));
        else lines.push(`${style.muted('Local')} ${local.state}${local.error ? `: ${local.error}` : ''}`);
        return lines;
    };

    const toolsPanel = (width: number): string[] =>
        renderPanel({ title: 'Tools', titleRight: snapshot.tools ? `${snapshot.tools.items.filter((item) => item.state === 'usable').length} usable` : undefined, lines: toolsCompactLines(snapshot.tools, style), width, tone: snapshot.tools?.waiting ? 'attention' : 'default', unicode, style });
    const syncPanel = (width: number): string[] => (snapshot.sync ? renderPanel({ title: 'Synchronization', titleRight: 'Git', lines: syncCompactLines(snapshot.sync, style), width, tone: ['failed', 'conflict'].includes(snapshot.sync.state) ? 'attention' : 'default', unicode, style }) : []);

    if (total >= WIDE_SNAPSHOT) {
        const rightWidth = Math.round(total * CONNECTION_SHARE);
        const leftWidth = total - rightWidth - 1;
        const left = [...renderPanel({ title: 'Current work', lines: work, width: leftWidth, tone: current ? 'accent' : 'default', unicode, style }), ...toolsPanel(leftWidth)];
        const sync = syncPanel(rightWidth);
        const right = [...sync, ...renderPanel({ title: 'Connection', lines: connectionLines(rightWidth - 4), width: rightWidth, unicode, style, minHeight: Math.max(0, left.length - 2 - sync.length) })];
        output.push(...sideBySide([left, right], [leftWidth, rightWidth]));
    } else {
        output.push(...renderPanel({ title: 'Current work', lines: work, width: total, tone: current ? 'accent' : 'default', unicode, style }), ...toolsPanel(total), ...syncPanel(total));
    }
    output.push(...inventoryPanels(total));
    output.push(...renderPanel({ title: 'Results and activity', lines: results, width: total, unicode, style }));
    if (total < WIDE_SNAPSHOT) output.push(...renderPanel({ title: 'Connection', lines: connectionLines(total - 4), width: total, unicode, style }));
    if (options.next?.length) output.push(style.muted(`  Next: ${options.next.join(' · ')}`));
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
