import QRCode from 'qrcode';
import { renderPanel, type TerminalPresentation } from './presentation.js';
import { agentActivity } from './agent-identity.js';

/** Prioritize requests affecting the active task without changing durable records. @private */
export function attentionRequests(state: Record<string, any>): Array<Record<string, any>> {
    return [...(state.requests ?? [])].sort((a, b) => Number(b.taskId === state.currentTask && Boolean(state.currentTask)) - Number(a.taskId === state.currentTask && Boolean(state.currentTask)));
}

/** Only verified connected observations advertise an available dashboard. @private */
export function dashboardUrl(state: Record<string, any>): string | undefined {
    if (['stopped', 'completed', 'interrupted', 'disconnected'].includes(state.status) || state.connection === 'disconnected' || /unreachable|stale/.test(state.status ?? '')) return undefined;
    return typeof state.url === 'string' && state.url ? state.url : undefined;
}

/** Names remain readable in raw output; pretty terminals add the stable compact portrait. @private */
export function agentLabel(entry: Record<string, any>, pretty = true): string {
    const identity = entry.visualIdentity;
    const name = identity?.name ?? entry.agentName ?? entry.agent ?? entry.name ?? 'unassigned';
    return `${pretty && identity ? `${identity.symbol} ` : ''}${name}`;
}

/** Generate a monochrome QR with its complete quiet zone; callers must keep every row intact. @private */
export function terminalQrRows(url: string): string[] {
    const { modules } = QRCode.create(url);
    const width = modules.size + 8;
    /** Read a module with the mandatory four-module white margin. */
    const dark = (x: number, y: number): boolean => x >= 4 && y >= 4 && x < width - 4 && y < width - 4 && Boolean(modules.get(y - 4, x - 4));
    return Array.from({ length: Math.ceil(width / 2) }, (_, row) => Array.from({ length: width }, (_, column) => {
        const top = dark(column, row * 2); const bottom = dark(column, row * 2 + 1);
        return top ? bottom ? '█' : '▀' : bottom ? '▄' : ' ';
    }).join(''));
}

/** Render a complete scannable code only when the snapshot terminal can fit it. @private */
export async function terminalServiceQr(url: string, presentation: TerminalPresentation): Promise<string> {
    if (!presentation.pretty) return '';
    const rows = terminalQrRows(url);
    if (rows[0]!.length >= presentation.width) return 'QR omitted because this terminal is too narrow; use the displayed URL or widen the terminal.\n';
    return `${rows.join('\n')}\n`;
}

/** The same status categories and attention hierarchy serve launch results and read-only snapshots. @private */
export function runtimeSummary(state: Record<string, any>, presentation: TerminalPresentation, title: string): string {
    const tasks = state.tasks ?? [];
    const current = tasks.find((task: Record<string, any>) => task.id === state.currentTask);
    const selection = state.currentSelection ?? current ?? {};
    const requests = attentionRequests(state);
    const attention = requests.length ? renderPanel(`User attention · ${requests.length} pending request(s)`, [], presentation, {
        tone: 'warning', details: requests.map(request => `User · Request ${request.id}: ${request.prompt}\nReason: ${request.reason}\nAffected work: ${request.taskId ?? 'system activity'}\nAnswer: ptbk answer ${JSON.stringify(request.id)} --path ${JSON.stringify(state.project)} --response "your reply"`),
    }) : '';
    return attention + renderPanel(`Promptbook ${state.engineVersion || 'version unavailable'} · ${title}`, [
        ['Project', String(state.project)], ['Observed', new Date(state.observedAt ?? Date.now()).toISOString() + ' · snapshot'],
        ['Status', String(state.status ?? 'unknown')], ['Mode', String(state.mode ?? 'no active service')],
        ['Task', String(current?.title || state.currentTask || 'idle')], ['Agent', state.currentTask ? agentLabel(selection, presentation.pretty) : 'none · Idle'],
        ['Activity', state.activity ?? agentActivity(state)], ['Harness', String(selection.harness ?? 'none')],
        ...(selection.model ? [['Model', String(selection.model)] as const] : []),
        ...(selection.thinkingLevel ? [['Effort', String(selection.thinkingLevel)] as const] : []),
        ['Queue', `${tasks.length} task(s)`], ['Requests', `${requests.length} pending`],
        ['Results', `${state.statistics?.completed ?? 0} completed, ${state.statistics?.failed ?? 0} failed`],
        ...(dashboardUrl(state) ? [['Browser', dashboardUrl(state)!] as const] : []),
    ], presentation, { details: [
        ...(state.phase ? [`Phase: ${state.phase}`] : []),
        ...(state.idleReason ? [`Waiting: ${state.idleReason}`] : []),
        ...(state.idleReason && state.nextAction && !state.error ? [`Next: ${state.nextAction}`] : []),
        ...(state.nextOpportunity ? [`Next opportunity: ${new Date(state.nextOpportunity).toISOString()}`] : []),
        ...(state.error ? [`Failure: ${state.error}`, `Next action: ${state.nextAction || 'Inspect ptbk recover and diagnostics.'}`, ...(state.diagnostic ? [`Diagnostic: ${state.diagnostic}`] : [])] : []),
        ...tasks.map((task: Record<string, any>) => `[${task.status}] ${task.title} · ${agentLabel(task, presentation.pretty)}${task.eligibility ? ` · ${task.eligibility.kind}: ${task.eligibility.reason}` : ''}`),
        ...(state.agents?.length ? [`Agents: ${state.agents.map((agent: Record<string, any>) => agentLabel(agent, presentation.pretty)).join(', ')}`] : []),
    ], next: [...(state.status === 'stopped' ? [`ptbk start --path ${JSON.stringify(state.project)}`] : [`ptbk dashboard --path ${JSON.stringify(state.project)}`]),
        `ptbk show --path ${JSON.stringify(state.project)} --json`, ...(requests.length ? [`ptbk answer --path ${JSON.stringify(state.project)}`] : [])] });
}
