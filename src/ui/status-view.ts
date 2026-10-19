import QRCode from 'qrcode';
import { formatShortTime } from '../common/time.js';
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
import { activityLabel, framedBadge } from './badges.js';
import { browserDetailLines, executionDetailLines, executionOneLine, lifecycleActions, lifecycleExplanation, lifecycleSummary } from './details.js';
import { renderPanel, sideBySide, type PanelTone } from './panels.js';
import { symbols, type TerminalProfile } from './terminal.js';

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
        readonly details?: { readonly execution: boolean; readonly browser: boolean };
        /** A pending confirmation or action feedback shown in the service-controls panel. */
        readonly controlNote?: string;
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
    const actions = lifecycleActions(snapshot);
    if (actions.length) lines.push(`Controls: ${actions.map((action) => `${action.command} (${action.label})`).join(' · ')}`);
    if (snapshot.service.persistenceNote) lines.push(`Persistence: ${snapshot.service.persistenceNote}`);
    lines.push(`Observed: ${snapshot.observedAt} (snapshot)`, '');
    const waiting = snapshot.chats.waiting;
    lines.push(`NEEDS YOUR ATTENTION (${waiting.length})`);
    if (!waiting.length) lines.push('- nothing');
    for (const chat of waiting) {
        lines.push(`- ${chat.awaiting?.sender ?? chat.agent ?? 'An agent'} waits for you in the chat {{${chat.name}}}`);
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
    lines.push('', 'EXECUTION DETAILS', ...executionDetailLines(snapshot.execution).map((line) => `  ${line}`));
    if (snapshot.browser) lines.push('', 'BROWSER DETAILS', ...browserDetailLines(snapshot.browser).map((line) => `  ${line}`));
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
        attention.push(`${marker} ${style.bold(chat.awaiting?.sender ?? chat.agent ?? 'An agent')} ${style.muted('waits for you in')} ${style.bold(`{{${chat.name}}}`)}${chat.unread ? style.accent(` · ${chat.unread} unread`) : ''}`);
        for (const line of wrap(chat.awaiting?.text ?? '', total - 8).slice(0, focused ? 8 : 2)) attention.push(`   ${line}`);
        if (chat.awaiting?.choices?.length) attention.push(`   ${style.muted('Choices:')} ${chat.awaiting.choices.map((choice, choiceIndex) => `${style.accent(`[${choiceIndex + 1}]`)} ${choice}`).join('  ')}`);
        attention.push(`   ${style.muted(options.live ? 'Press A to open the conversation' : `Answer: ptbk answer "${chat.name}"`)}${chat.links.length ? style.muted(` · ${chat.links.join(', ')}`) : ''}`);
    });
    if (options.live?.input) attention.push('', ...options.live.input);
    if (attention.length) output.push(...renderPanel({ title: `${marks.warn} Needs your attention (${waiting.length})`, titleRight: `${snapshot.chats.total} chats · ${snapshot.chats.unread} unread`, lines: attention, width: total, tone: waiting.length ? 'attention' : 'accent', unicode, style }));
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
    ];
    output.push(...renderPanel({ title: 'Service controls', titleRight: snapshot.service.mode, lines: controls, width: total, tone: snapshot.service.state === 'running' ? 'default' : 'attention', unicode, style }));

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
    if (browser && (browser.state === 'failed' || browser.recovery?.state === 'blocked') && browser.lastFailure) {
        work.push(`${style.error(marks.fail)} ${style.bold('Project browser')}: ${browser.lastFailure.summary}${browser.recovery?.state === 'retrying' ? style.muted(' · recovering automatically') : ''}${options.live ? style.muted(' · B details') : ''}`);
    }

    // Queue.
    const queue: string[] = [];
    const queueLimit = options.live ? 8 : 10;
    if (!snapshot.queue.length) queue.push(style.muted('No unfinished tasks.'));
    for (const item of snapshot.queue.slice(0, queueLimit)) {
        const tone = item.readiness === 'ready' || item.readiness === 'active' ? style.success : ['blocked', 'failed', 'needs-recovery'].includes(item.readiness) ? style.error : item.readiness === 'awaiting-user' || item.readiness.includes('assign') ? style.warning : style.muted;
        queue.push(`${tone(item.readiness.padEnd(17))} ${item.title}`);
        queue.push(style.muted(`${' '.repeat(18)}${item.reason}${item.agent ? ` · ${item.agent}` : ''}`));
    }
    if (snapshot.queue.length > queueLimit) queue.push(style.muted(`… ${snapshot.queue.length - queueLimit} more (ptbk list)`));

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

    // Expandable detail panels (live dashboard only; initially collapsed, opened with E and B).
    const detailPanels = (): string[] => {
        const panels: string[] = [];
        const details = options.live?.details;
        if (details?.execution) panels.push(...renderPanel({ title: 'Execution details', titleRight: 'E hides', lines: executionDetailLines(snapshot.execution, style), width: total, unicode, style }));
        if (details?.browser) panels.push(...renderPanel({ title: 'Browser details', titleRight: 'B hides', lines: browserDetailLines(snapshot.browser, style, { keys: true }), width: total, unicode, style }));
        return panels;
    };

    const twoColumns = total >= 100;
    if (twoColumns) {
        const qrWidth = options.qr ? Math.max(...options.qr.lines.map((line) => stringWidth(line))) + 4 : 0;
        const rightWidth = Math.max(Math.round(total * 0.38), Math.min(qrWidth, Math.round(total * 0.5)));
        const leftWidth = total - rightWidth - 1;
        const left = [
            ...renderPanel({ title: 'Current work', lines: work, width: leftWidth, tone: current ? 'accent' : 'default', unicode, style }),
            ...renderPanel({ title: `Queue (${snapshot.queueTotal})`, lines: queue, width: leftWidth, unicode, style }),
        ];
        const right = renderPanel({ title: 'Connection', lines: connectionLines(rightWidth - 4), width: rightWidth, unicode, style, minHeight: Math.max(0, left.length - 2) });
        output.push(...sideBySide([left, right], [leftWidth, rightWidth]));
        output.push(...detailPanels());
        output.push(...renderPanel({ title: 'Results and activity', lines: results, width: total, unicode, style }));
    } else {
        output.push(...renderPanel({ title: 'Current work', lines: work, width: total, tone: current ? 'accent' : 'default', unicode, style }));
        output.push(...detailPanels());
        output.push(...renderPanel({ title: `Queue (${snapshot.queueTotal})`, lines: queue, width: total, unicode, style }));
        output.push(...renderPanel({ title: 'Results and activity', lines: results, width: total, unicode, style }));
        const qrTooWide = options.qr && Math.max(...options.qr.lines.map((line) => stringWidth(line))) > total - 4;
        const connection = connectionLines(total - 4);
        output.push(...renderPanel({ title: 'Connection', lines: qrTooWide ? [...connection.filter((line) => !options.qr!.lines.includes(line)), style.warning('The terminal is too narrow for a scannable QR code; use the link above.')] : connection, width: total, unicode, style }));
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
