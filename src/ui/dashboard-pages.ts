import { join } from 'node:path';
import { formatShortTime } from '../common/time.js';
import type { CachePreview, SwapPlan } from '../engine/health.js';
import { formatBytes, formatMiB } from '../engine/health.js';
import type { CurrentWorkView, ServiceSnapshot } from '../engine/snapshot.js';
import { TASK_SORT_FIELDS, sortTasks, type TaskInventoryItem, type TaskSortField } from '../tasks/views.js';
import { stringWidth, wrap } from './ansi.js';
import { activityLabel, framedBadge, inlineBadge, type BadgeActivity } from './badges.js';
import {
    browserDetailLines,
    executionDetailLines,
    healthDetailLines,
    healthPauseReasons,
    lifecycleActions,
    lifecycleExplanation,
    pauseReasonLines,
    syncDetailLines,
    toolDetailLines,
    toolRow,
} from './details.js';
import type { HomeTile } from './dashboard-home.js';
import type { PreparedQr } from './status-view.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * Fields the agent inventory can be sorted by (`activity` keeps working and waiting agents first).
 *
 * @private terminal dashboard pages
 */
export const TEAM_SORT_FIELDS = ['activity', 'queue', 'name', 'role'] as const;

/**
 * One agent sort field.
 *
 * @private terminal dashboard pages
 */
export type TeamSortField = (typeof TEAM_SORT_FIELDS)[number];

/**
 * A full dashboard page with its viewer-local state (focus, sort, scroll, previews); never engine state.
 *
 * @private terminal dashboard pages
 */
export type DashboardPage =
    | { readonly kind: 'work'; scroll: number; focus: number; selected?: string }
    | { readonly kind: 'system'; scroll: number }
    | { readonly kind: 'health'; scroll: number; cache?: CachePreview; swap?: SwapPlan }
    | { readonly kind: 'tools'; scroll: number; focus: number; selected?: string }
    | { readonly kind: 'tool'; scroll: number; readonly name: string }
    | { readonly kind: 'agents'; scroll: number; focus: number; selected?: string; detail: boolean; sort: TeamSortField }
    | { readonly kind: 'chats'; scroll: number; focus: number; selected?: string }
    | { readonly kind: 'tasks'; scroll: number; focus: number; selected?: string; sort: TaskSortField; descending: boolean; detail: boolean }
    | { readonly kind: 'results'; scroll: number; follow: boolean }
    | { readonly kind: 'connection'; scroll: number }
    | { readonly kind: 'sync'; scroll: number };

/**
 * A fresh page for a home tile.
 *
 * @private terminal dashboard pages
 */
export function pageForTile(tile: HomeTile): DashboardPage {
    switch (tile) {
        case 'work':
            return { kind: 'work', scroll: 0, focus: 0 };
        case 'tools':
            return { kind: 'tools', scroll: 0, focus: 0 };
        case 'agents':
            return { kind: 'agents', scroll: 0, focus: 0, detail: false, sort: 'activity' };
        case 'chats':
            return { kind: 'chats', scroll: 0, focus: 0 };
        case 'tasks':
            return { kind: 'tasks', scroll: 0, focus: 0, sort: 'smart', descending: false, detail: false };
        case 'results':
            return { kind: 'results', scroll: Number.MAX_SAFE_INTEGER, follow: true };
        default:
            return { kind: tile, scroll: 0 };
    }
}

/**
 * Inputs every page body reads.
 *
 * @private terminal dashboard pages
 */
export type PageContext = {
    readonly snapshot: ServiceSnapshot;
    readonly terminal: TerminalProfile;
    readonly frame: number;
    /** The complete task inventory (loaded on demand). */
    readonly inventory?: readonly TaskInventoryItem[];
    readonly qr?: PreparedQr;
    readonly pairingUrl?: string;
    readonly noQr: boolean;
    /** This invocation owns the engine (foreground). */
    readonly owning: boolean;
};

/**
 * A rendered page body: its title/context, all lines, the row to keep visible and the page's own keys.
 *
 * @private terminal dashboard pages
 */
export type PageBody = { readonly title: string; readonly context: string; readonly body: string[]; readonly anchor?: number; readonly legend: string };

/**
 * Recent errors listed on the Current work page.
 */
const RECENT_ERRORS = 5;

/**
 * Column width of setting keys on the System page.
 */
const SETTING_KEY_WIDTH = 34;

/**
 * Prominence of an agent's observed activity in the default team order.
 */
const ACTIVITY_RANK: Readonly<Record<BadgeActivity, number>> = { working: 0, 'waiting-user': 1, 'waiting-provider': 2, blocked: 3, failed: 4, paused: 5, idle: 6, completed: 7 };

/**
 * Unfinished tasks of one agent from the complete inventory.
 *
 * @private terminal dashboard pages
 */
export function queueOf(inventory: readonly TaskInventoryItem[] | undefined, name: string): TaskInventoryItem[] {
    return (inventory ?? []).filter((item) => item.agent?.replace(/^@|^\{|\}$/g, '').toLowerCase() === name.toLowerCase() && !['done', 'retired'].includes(item.readiness));
}

/**
 * The team in the viewer's chosen order (project agents before core roles and Expert within equal keys).
 *
 * @private terminal dashboard pages
 */
export function teamOrder(snapshot: ServiceSnapshot, sort: TeamSortField, inventory?: readonly TaskInventoryItem[]): ServiceSnapshot['agents'] {
    const roleRank = (agent: ServiceSnapshot['agents'][number]): number => (agent.role === 'engine' ? 2 : agent.role === 'core' ? 1 : 0);
    const byName = (a: ServiceSnapshot['agents'][number], b: ServiceSnapshot['agents'][number]): number => a.name.localeCompare(b.name);
    return [...snapshot.agents].sort((a, b) => {
        if (sort === 'name') return byName(a, b);
        if (sort === 'role') return roleRank(a) - roleRank(b) || byName(a, b);
        if (sort === 'queue') return queueOf(inventory, b.name).length - queueOf(inventory, a.name).length || byName(a, b);
        return ACTIVITY_RANK[a.activity] - ACTIVITY_RANK[b.activity] || roleRank(a) - roleRank(b) || byName(a, b);
    });
}

/**
 * The viewer's current task order.
 *
 * @private terminal dashboard pages
 */
export function taskOrder(context: Pick<PageContext, 'snapshot' | 'inventory'>, page: Extract<DashboardPage, { kind: 'tasks' }>): TaskInventoryItem[] {
    return sortTasks([...(context.inventory ?? [])], page.sort, page.descending, Date.parse(context.snapshot.observedAt));
}

/**
 * The tool shown by a nested tool page or focused on the Tools page.
 *
 * @private terminal dashboard pages
 */
export function toolsOf(snapshot: ServiceSnapshot): NonNullable<ServiceSnapshot['tools']>['items'] {
    return snapshot.tools?.items ?? [];
}

/**
 * Builds the body of a page from the shared snapshot and the page's viewer-local state.
 *
 * @private terminal dashboard pages
 */
export function pageBody(page: DashboardPage, context: PageContext): PageBody {
    const { snapshot, terminal } = context;
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const pointer = (focused: boolean): string => (focused ? style.accent(marks.pointer) : ' ');
    const time = (iso?: string): string => (iso ? formatShortTime(Date.parse(iso)) : style.muted('unknown'));
    const width = Math.max(20, terminal.columns() - 2);
    const back = 'Esc back';
    switch (page.kind) {
        case 'work': {
            const body: string[] = [];
            const active = activeWork(snapshot);
            const capacity = snapshot.capacity;
            if (capacity) body.push(`${style.muted('Capacity ')} ${style.bold(`${capacity.active}/${capacity.limit}`)} active${style.muted(` · ${capacity.waiting} waiting · ${capacity.queued} queued (execution.maxConcurrentWork)`)}`);
            let anchor: number | undefined;
            if (active.length) {
                body.push('', style.bold(`Active work (${active.length})`));
                active.forEach((item, index) => {
                    if (index === page.focus) anchor = body.length;
                    const label = item.kind === 'chat' ? `${style.accent('chat')} ${item.taskTitle}` : `${inlineBadge(item.agent.name, item.agent.activity, style, terminal.reducedMotion ? 0 : context.frame)} ${item.taskTitle}`;
                    body.push(`${pointer(index === page.focus)} ${label}${style.muted(` · ${item.phase}${item.attempt ? ` ${item.attempt}/${item.attemptBudget}` : ''}${item.detail ? ` · ${item.detail}` : ''}`)}`);
                });
                const selected = active[Math.max(0, Math.min(page.focus, active.length - 1))]!;
                body.push('', style.bold(selected.kind === 'chat' ? 'Selected chat turn' : 'Selected work'));
                if (selected.kind !== 'chat') {
                    const badge = framedBadge(selected.agent.name, selected.agent.activity, style, terminal.unicode, terminal.reducedMotion ? 0 : context.frame);
                    const info = [`${style.bold(selected.agent.name)} ${style.muted(activityLabel(selected.agent.activity))}`, selected.taskTitle, style.muted(`${selected.kind}${selected.target ? ` → ${selected.target.title}` : ''}`)];
                    for (let row = 0; row < 3; row++) body.push(`${badge[row]}  ${info[row]}`);
                } else body.push(selected.taskTitle);
                body.push(`${style.muted('Phase  ')} ${selected.phase}${selected.attempt ? ` · attempt ${selected.attempt}/${selected.attemptBudget}` : ''}${selected.detail ? style.muted(` · ${selected.detail}`) : ''}`);
                body.push(`${style.muted('Task   ')} ${selected.taskRef}${selected.trace ? style.muted(` · trace ${selected.trace}`) : ''}`);
                if (selected.files?.length) body.push(`${style.muted('Files  ')} ${selected.files.join(', ')}`);
                if (selected.wait) body.push(`${style.warning(marks.wait)} ${selected.wait.reason}${selected.wait.until ? style.muted(` · until ${time(selected.wait.until)}`) : ''}${selected.wait.skippable ? style.muted(' · S skips this wait') : ''}`);
                const execution = snapshot.executions?.find((candidate) => candidate.task.ref === selected.taskRef) ?? (index0(active, selected) ? snapshot.execution : undefined);
                if (selected.kind !== 'chat') body.push('', style.bold('Execution'), ...(snapshot.phase === 'unknown' ? [style.muted('Unavailable: the service runs another ptbk version.')] : executionDetailLines(execution, style)));
            } else {
                body.push(`${style.bold(snapshot.phase)}${snapshot.wait ? ` ${marks.dot} ${snapshot.wait.reason}` : ''}`);
                body.push('', style.bold('Execution'), ...(snapshot.phase === 'unknown' ? [style.muted('Unavailable: the service runs another ptbk version.')] : executionDetailLines(snapshot.execution, style)));
            }
            if (snapshot.wait) {
                body.push('', `${style.warning(marks.wait)} ${snapshot.wait.reason}${snapshot.wait.until ? style.muted(` · until ${time(snapshot.wait.until)}`) : ''}${snapshot.wait.skippable ? style.muted(' · S skips this wait') : ''}`);
                if (snapshot.wait.action) body.push(`${style.accent(marks.arrow)} ${snapshot.wait.action}`);
            }
            for (const blocker of snapshot.blockers) {
                body.push(`${style.error(marks.fail)} ${style.bold(blocker.title)}: ${blocker.reason}`);
                if (blocker.action) body.push(`  ${style.accent(marks.arrow)} ${blocker.action}${blocker.recheckAt ? style.muted(` · recheck ${time(blocker.recheckAt)}`) : ''}`);
            }
            const failing = (snapshot.browsers?.length ? snapshot.browsers : snapshot.browser ? [snapshot.browser] : []).filter((browser) => (browser.state === 'failed' || browser.recovery?.state === 'blocked') && browser.lastFailure);
            for (const browser of failing) body.push('', `${style.error(marks.fail)} ${style.bold(`Browser ${browser.name}`)}: ${browser.lastFailure!.summary}${style.muted(' · T opens Tools')}`);
            const errors = snapshot.errors.slice(-RECENT_ERRORS);
            if (errors.length) body.push('', style.bold('Recent errors'), ...errors.flatMap((error) => [`${style.muted(time(error.at))} ${style.error(error.summary)}`, ...(error.next ? [style.muted(`      next: ${error.next}`)] : [])]));
            return { title: 'Current work', context: 'Concurrent tasks and chat turns, their phases, waits and the actual harness/model/thinking context of the selected run', body, anchor, legend: `${active.length > 1 ? '↑↓ choose · ' : ''}S skip a pacing wait · ${back}` };
        }
        case 'system': {
            const { service, engine } = snapshot;
            const reasons = service.pauseReasons ?? [];
            const actions = lifecycleActions(snapshot).filter((action) => action.key);
            const health = healthPauseReasons(snapshot);
            const body = [
                style.bold('Lifecycle'),
                `${style.muted('State     ')} ${service.state === 'running' ? style.success(service.state) : style.warning(service.state)} — ${lifecycleExplanation(snapshot)}`,
                ...(service.lifecycle?.intent ? [`${style.muted('Pending   ')} ${service.lifecycle.intent}${service.lifecycle.draining ? ' (active work finishes first)' : ''}${service.lifecycle.since ? style.muted(` · since ${time(service.lifecycle.since)}`) : ''}${service.lifecycle.cancellable ? style.muted(' · U cancels') : ''}`] : []),
                `${style.muted('Pause     ')} ${reasons.length ? `${reasons.length} active reason${reasons.length === 1 ? '' : 's'}` : style.muted('no pause reason; background work may start')}`,
                ...pauseReasonLines(reasons).map((line, index) => `  ${reasons[index]!.kind === 'manual' ? style.warning(marks.bullet) : reasons[index]!.severity === 'hard' ? style.error(marks.bullet) : style.warning(marks.bullet)} ${line}${style.muted(` · since ${time(reasons[index]!.since)}`)}`),
                ...(health.length ? [style.muted('  Resume removes only the manual reason; scheduling continues once every reason is gone. Health reasons are handled on the Health page.')] : []),
                '',
                style.bold('Controls'),
                ...(actions.length ? actions.map((action) => `  ${style.accent(action.key)} ${action.label}${style.muted(`  (${action.command})`)}`) : [style.muted('  No lifecycle action applies now.')]),
                ...(context.owning ? [style.muted('  This terminal owns the engine (foreground): leaving it stops the engine gracefully.')] : [style.muted('  Leaving this viewer (Q) never stops the engine.')]),
                '',
                style.bold('Engine and process'),
                `${style.muted('Engine    ')} ptbk ${engine.version} ${style.muted(`(${engine.scope} installation · ${engine.installation})`)}`,
                `${style.muted('Process   ')} ${service.mode}${service.pid ? ` · PID ${service.pid}` : ''}${service.startedAt ? style.muted(` · started ${time(service.startedAt)}`) : ''}${service.instanceId ? style.muted(` · instance ${service.instanceId.slice(0, 8)}`) : ''}`,
                `${style.muted('Project   ')} ${snapshot.project.path}`,
                `${style.muted('Runtime   ')} ${join(snapshot.project.path, '.ptbk')} ${style.muted('(ignored runtime state)')}`,
                `${style.muted('Commits   ')} ${service.commitMode === 'commit' ? 'automatic' : style.warning('NO-COMMIT mode (results stay uncommitted)')}`,
                `${style.muted('Persistent')} ${service.persistent === null ? 'n/a' : service.persistent ? 'yes (restarts after reboot)' : style.warning('no')}${service.persistenceNote ? style.muted(` · ${service.persistenceNote}`) : ''}`,
                `${style.muted('Config    ')} promptbookVersion ${snapshot.configuration?.promptbookVersion ?? style.muted('unknown')}${snapshot.configuration?.pending ? style.warning(` · pending: ${snapshot.configuration.pending}`) : ''}`,
                '',
                style.bold(`Effective settings (${snapshot.settings.length})`),
                ...snapshot.settings.map((setting) => `  ${setting.key.padEnd(SETTING_KEY_WIDTH)} ${setting.value}${style.muted(` · ${setting.source}${setting.application !== 'live' ? ` · applies ${setting.application}` : ''}`)}`),
            ];
            return { title: 'System', context: 'Engine identity, lifecycle, every active pause reason and manual controls', body, legend: `${actions.map((action) => `${action.key} ${action.label}`).join(' · ')}${actions.length ? ' · ' : ''}↑↓ scroll · ${back}` };
        }
        case 'health': {
            const health = snapshot.health;
            if (!health) return { title: 'Health', context: 'Host resources of this engine', body: [style.muted('This engine does not report health (another ptbk version).')], legend: back };
            const incidents = health.incidents;
            const body = healthDetailLines(health, style);
            body.push('', style.bold('Remediation'));
            body.push(`  ${style.accent('K')} clean the Promptbook project cache ${style.muted(`(${health.remediation.cache.path}/; preview first, then confirm)`)}`);
            if (page.cache) {
                const removable = page.cache.entries.filter((entry) => !entry.kept);
                body.push(`    ${removable.length} removable entr${removable.length === 1 ? 'y' : 'ies'}, ${formatBytes(page.cache.removableBytes)}${page.cache.keptBytes ? style.muted(` · ${formatBytes(page.cache.keptBytes)} kept (changed recently)`) : ''}`);
                for (const entry of page.cache.entries.slice(0, 8)) body.push(style.muted(`      ${entry.kept ? 'keep ' : 'clean'} ${entry.name} · ${formatBytes(entry.bytes)}${entry.kept ? ` · ${entry.kept}` : ''}`));
            }
            body.push(`  ${health.remediation.swap.supported ? style.accent('W') : style.muted('W')} swap ${style.muted(`· ${health.remediation.swap.note}`)}`);
            if (page.swap) {
                body.push(`    ${page.swap.note}`);
                for (const area of page.swap.current ?? []) body.push(style.muted(`      active ${area.path} · ${formatMiB(area.sizeMiB)} (${formatMiB(area.usedMiB)} used)`));
                if (page.swap.proposal) {
                    body.push(`    Plan: ${formatMiB(page.swap.proposal.sizeMiB)} at ${page.swap.proposal.path} · ${page.swap.proposal.privilege === 'missing' ? style.warning('needs an administrator (never prompts for a password)') : `runs as ${page.swap.proposal.privilege}`}`);
                    for (const command of page.swap.proposal.commands) body.push(style.muted(`      ${command}`));
                    body.push(style.muted(`      keep after reboot (/etc/fstab): ${page.swap.proposal.persistLine}`));
                }
            }
            const soft = incidents.some((incident) => incident.severity === 'soft' && incident.pauses);
            body.push('', style.muted('Manual Pause/Resume lives on System; viewing this page never resolves an incident.'));
            return {
                title: 'Health',
                context: 'Disk, RAM, swap, CPU and connectivity observed by this engine’s Health sub-engine',
                body,
                legend: `${soft ? 'O override the soft incident · ' : ''}K clean cache · W swap · M measure now · ↑↓ scroll · ${back}`,
            };
        }
        case 'tools': {
            const items = toolsOf(snapshot);
            const body: string[] = [];
            body.push(...items.map((item, index) => `${pointer(index === page.focus)} ${toolRow(item, style)}`));
            if (!items.length) body.push(style.muted('No tools are configured; press N to add one.'));
            if (snapshot.tools?.waiting) body.push('', style.warning(`New work waits for tools: ${snapshot.tools.waiting.reason}`), `  ${snapshot.tools.waiting.action}`);
            for (const problem of snapshot.tools?.problems ?? []) body.push(style.warning(`Problem: ${problem}`));
            const focused = items[page.focus];
            if (focused) body.push('', style.muted(`${focused.name}: ${focused.summary}`));
            return {
                title: 'Tools',
                context: `${items.length} named tool${items.length === 1 ? '' : 's'} · saved changes are committed immediately and apply to new work at once`,
                body,
                anchor: page.focus,
                legend: `↑↓ choose · Enter details · Space enable/disable · N add · M modify · [ ] move · D remove · ${back}`,
            };
        }
        case 'tool': {
            const item = toolsOf(snapshot).find((candidate) => candidate.name === page.name);
            if (!item) return { title: `Tools › ${page.name}`, context: 'This tool is no longer configured.', body: [style.muted('It was removed (possibly from another client).')], legend: back };
            const browser = item.type === 'BROWSER' ? (snapshot.browsers ?? []).find((candidate) => candidate.name === item.name) ?? (snapshot.browser?.name === item.name ? snapshot.browser : undefined) : undefined;
            const body = [...toolDetailLines(item, style), ...(item.type === 'BROWSER' ? ['', style.bold('Browser'), ...browserDetailLines(browser, style, { keys: true })] : [])];
            return { title: `Tools › ${item.name}`, context: `${item.variantLabel} · ${item.type} ${item.variant}`, body, legend: `Space enable/disable · M modify · D remove${item.type === 'BROWSER' ? ' · 1 recheck · 2 retry · 3 restart this browser' : ''} · ${back}` };
        }
        case 'agents': {
            const items = teamOrder(snapshot, page.sort, context.inventory);
            const body: string[] = [];
            let anchor = 0;
            items.forEach((agent, index) => {
                const queued = queueOf(context.inventory, agent.name);
                if (index === page.focus) anchor = body.length;
                body.push(`${pointer(index === page.focus)} ${inlineBadge(agent.name, agent.activity, style, terminal.reducedMotion ? 0 : context.frame)} ${style.muted(`${activityLabel(agent.activity)}${queued.length ? ` · ${queued.length} queued` : ''}${agent.role === 'engine' ? ' · engine-provided' : agent.role === 'core' ? ' · core' : ''}`)}`);
                if (index === page.focus && page.detail) {
                    const working = activeWork(snapshot).filter((item) => item.kind !== 'chat' && item.agent.name === agent.name);
                    body.push(...(working.length ? working.map((item) => `    ${style.success('now')} ${item.taskTitle} ${style.muted(`(${item.phase})`)}`) : [style.muted('    Not working on a task now.')]));
                    body.push(...queued.slice(0, 8).map((item) => `    ${style.muted(item.readiness.padEnd(16))} ${item.title}`));
                }
            });
            if (!items.length) body.push(style.muted('No agents are loaded.'));
            const focused = items[page.focus];
            return {
                title: 'Agents',
                context: `${items.length} agents — the complete team, core roles and Expert included · sorted by ${page.sort}`,
                body,
                anchor,
                legend: `↑↓ choose · Enter ${page.detail ? 'hide' : 'show'} work · C chat · E ${focused?.role === 'engine' ? 'view' : 'edit'} Book · S sort · ${back}`,
            };
        }
        case 'chats': {
            const chats = snapshot.chats.recent;
            const body = chats.map(
                (chat, index) =>
                    `${pointer(index === page.focus)} ${chat.status === 'waiting-for-user' ? style.warning(`${marks.warn} `) : ''}${chat.title ?? chat.name}${chat.unread ? style.accent(` · ${chat.unread} unread`) : ''}${style.muted(` · ${chat.title && chat.title !== chat.name ? `{${chat.name}} · ` : ''}${chat.members.join(', ')}${chat.links.length ? ` · ${chat.links.join(', ')}` : ''}`)}`,
            );
            if (!chats.length) body.push(style.muted('No chats yet; press N to start one (Chatter first).'));
            const waiting = snapshot.chats.waiting;
            if (waiting.length) {
                body.push('', style.bold(`Waiting for you (${waiting.length})`));
                for (const chat of waiting) {
                    body.push(`${style.warning(marks.warn)} ${style.bold(chat.awaiting?.sender ?? chat.agent ?? 'An agent')} ${style.muted('in')} {${chat.name}}`);
                    for (const line of wrap(chat.awaiting?.text ?? '', width - 4).slice(0, 4)) body.push(`    ${line}`);
                    if (chat.awaiting?.choices?.length) body.push(`    ${style.muted('Choices:')} ${chat.awaiting.choices.join(' | ')}`);
                }
            }
            return {
                title: 'Chats',
                context: `${snapshot.chats.total} chat${snapshot.chats.total === 1 ? '' : 's'}${snapshot.chats.total > chats.length ? `, latest ${chats.length}` : ''} · ${snapshot.chats.unread} unread · ${waiting.length} waiting for you`,
                body,
                anchor: page.focus,
                legend: `↑↓ choose · Enter open · N new chat (Chatter first) · A answer the waiting one · ${back}`,
            };
        }
        case 'tasks': {
            if (!context.inventory) return { title: 'Tasks', context: 'Loading the complete task inventory…', body: [style.muted('Loading…')], legend: back };
            const items = taskOrder(context, page);
            const body: string[] = [];
            let anchor = 0;
            items.forEach((item, index) => {
                const when = item.until ? `next ${formatShortTime(Date.parse(item.until))}` : item.lastDone ? `done ${formatShortTime(Date.parse(item.lastDone))}` : '';
                if (index === page.focus) anchor = body.length;
                body.push(`${pointer(index === page.focus)} ${style.muted(item.readiness.padEnd(16).slice(0, 16))} ${item.title}${style.muted(`${item.agent ? ` · ${item.agent}` : ''}${item.priority ? ` · P${item.priority}` : ''}${item.repeat ? ` · every ${item.repeat}` : ''}${when ? ` · ${when}` : ''}`)}`);
                if (index === page.focus && page.detail) {
                    body.push(`    ${style.muted('Status')} ${item.readiness} — ${item.reason}`, `    ${style.muted('Source')} ${item.source}${item.origin ? style.muted(` · origin ${item.origin}`) : ''}`, ...(item.model ? [`    ${style.muted('MODEL ')} ${item.model.replace(/\n/g, ' | ')}`] : []));
                    // The task's pending question is the same one its chat shows; answering here answers it there.
                    const question = item.waitingChat ? snapshot.chats.waiting.find((chat) => chat.name === item.waitingChat) : undefined;
                    if (question?.awaiting) body.push(`    ${style.warning(`${marks.warn} ${question.awaiting.sender} asks:`)} ${question.awaiting.text.split('\n').filter(Boolean).at(-1) ?? ''}`, `    ${style.muted(`A answers in {${question.title ?? question.name}}`)}`);
                }
            });
            if (!items.length) body.push(style.muted('No tasks yet; press T to talk to Tasker.'));
            return {
                title: 'Tasks',
                context: `${items.length} tasks · ${page.sort === 'smart' ? 'smart order: current, coming up, recent, distant, history' : `sorted by ${page.sort}`}${page.descending ? ' (reversed)' : ''} · viewer order only, never scheduling`,
                body,
                anchor,
                legend: `↑↓ choose · Enter ${page.detail ? 'hide' : 'show'} details · ${items[page.focus]?.waitingChat ? 'A answer · ' : ''}E edit source · S sort (${TASK_SORT_FIELDS.length}) · D reverse · T Tasker · ${back}`,
            };
        }
        case 'results': {
            const body = [`${style.muted('This session:')} ${style.success(`${marks.ok} ${snapshot.results.completed} completed`)}  ${snapshot.results.failed ? style.error(`${marks.fail} ${snapshot.results.failed} failed`) : style.muted(`${marks.fail} 0 failed`)}`, '', style.bold('Recent results')];
            for (const result of snapshot.results.recent) body.push(`${result.outcome.startsWith('completed') ? style.success(marks.ok) : result.outcome === 'failed' ? style.error(marks.fail) : style.warning(marks.wait)} ${result.title}${style.muted(`${result.agent ? ` · ${result.agent}` : ''}${result.commit ? ` · ${result.commit.slice(0, 8)}` : ''}`)}`);
            if (!snapshot.results.recent.length) body.push(style.muted('No results yet.'));
            body.push('', style.bold(`Activity (${snapshot.activity.length})`));
            for (const line of snapshot.activity) {
                const colored = line.level === 'error' ? style.error : line.level === 'warning' ? style.warning : (text: string): string => text;
                body.push(`${style.muted(formatShortTime(Date.parse(line.at)))} ${colored(line.text)}`);
            }
            return { title: 'Results and activity', context: 'Outcomes of this session and the bounded runtime activity log', body, ...(page.follow ? { anchor: body.length - 1 } : {}), legend: `↑↓ PgUp PgDn scroll · End follow${page.follow ? 'ing' : ''} · ${back}` };
        }
        case 'connection': {
            const { local, remote } = snapshot.connection;
            const breakLink = (link: string, indent = '  '): string[] => {
                const chunks: string[] = [];
                const room = Math.max(10, width - indent.length);
                for (let index = 0; index < link.length; index += room) chunks.push(`${indent}${link.slice(index, index + room)}`);
                return chunks;
            };
            const body: string[] = [];
            if (remote.state === 'ready' && remote.url) body.push(`${style.success('Remote')} ${style.muted(`ready via ${remote.provider}; the relay sees traffic (pairing required)`)}`, ...breakLink(remote.url).map((line) => style.bold(line)));
            else body.push(`${remote.state === 'disabled' ? style.muted('Remote') : style.warning('Remote')} ${remote.state}${remote.provider ? ` via ${remote.provider}` : ''}${remote.error ? `: ${remote.error}` : ''}`);
            if (local.url) body.push(`${local.state === 'ready' ? style.success('Local') : style.muted('Local')} ${style.muted('(this computer only)')}`, ...breakLink(local.url));
            else body.push(`${style.muted('Local')} ${local.state}${local.error ? `: ${local.error}` : ''}`);
            if (context.qr) {
                body.push('', style.muted(context.qr.label));
                if (Math.max(...context.qr.lines.map((line) => stringWidth(line))) > width) body.push(style.warning('The terminal is too narrow for a scannable QR code; use the link instead.'));
                else body.push(...context.qr.lines);
                if (context.qr.sensitive) body.push(style.warning('Single-use pairing code, valid 10 min. Do not share it.'));
            } else if (context.noQr) body.push('', style.muted('QR hidden (--no-qr).'));
            if (context.pairingUrl) body.push('', style.muted(remote.state === 'ready' ? 'Pairing link (secret, single use):' : 'Pairing link (this computer only):'), ...breakLink(context.pairingUrl));
            else if (snapshot.connection.pairing && !snapshot.connection.pairing.available && local.state === 'ready') body.push('', style.muted('No active pairing link · V renews it'));
            return { title: 'Connection', context: 'Verified local and remote dashboard access, pairing and QR', body, legend: `V renew pairing · ↑↓ scroll · ${back}` };
        }
        case 'sync': {
            if (!snapshot.sync) return { title: 'Synchronization', context: 'Automatic synchronization is off (isAutoSync false).', body: [style.muted('Nothing to show while autosync is disabled.')], legend: back };
            return { title: 'Synchronization', context: 'Git autosync with the tracked remote (shared coordinator; never a second scheduler)', body: syncDetailLines(snapshot.sync, style), legend: `G synchronize now · ↑↓ scroll · ${back}` };
        }
    }
}

/**
 * Identities of the selectable rows of a list page, in displayed order (empty for other pages).
 *
 * @private terminal dashboard pages
 */
export function pageItemKeys(page: DashboardPage, context: Pick<PageContext, 'snapshot' | 'inventory'>): string[] {
    switch (page.kind) {
        case 'tools':
            return toolsOf(context.snapshot).map((item) => item.name);
        case 'agents':
            return teamOrder(context.snapshot, page.sort, context.inventory).map((agent) => agent.key);
        case 'chats':
            return context.snapshot.chats.recent.map((chat) => chat.name);
        case 'work':
            return activeWork(context.snapshot).map((item) => item.unit ?? item.taskRef);
        case 'tasks':
            return taskOrder(context, page).map((item) => item.ref);
        default:
            return [];
    }
}

/**
 * Keeps a list page's selection on the same item across live updates and re-sorting (the row index follows the item;
 * a vanished item leaves the cursor at its former position).
 *
 * @private terminal dashboard pages
 */
export function keepSelection(page: DashboardPage, context: Pick<PageContext, 'snapshot' | 'inventory'>): void {
    if (!('focus' in page)) return;
    const keys = pageItemKeys(page, context);
    const index = page.selected === undefined ? -1 : keys.indexOf(page.selected);
    page.focus = index >= 0 ? index : Math.max(0, Math.min(page.focus, keys.length - 1));
    page.selected = keys[page.focus];
}

/**
 * Every active unit of a snapshot (an older engine reports only its single current task).
 *
 * @private terminal dashboard pages
 */
export function activeWork(snapshot: ServiceSnapshot): readonly CurrentWorkView[] {
    return snapshot.active ?? (snapshot.current ? [snapshot.current] : []);
}

/**
 * Whether an item is the first of a list (an older engine's single execution belongs to it).
 */
function index0(items: readonly CurrentWorkView[], item: CurrentWorkView): boolean {
    return items[0] === item;
}
