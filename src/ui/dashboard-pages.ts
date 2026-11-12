import { receiptLine } from '../engine/task-control.js';
import { join } from 'node:path';
import { formatShortTime } from '../common/time.js';
import type { HarnessSessionRecord } from '../harness/sessions.js';
import type { CachePreview, SwapPlan } from '../engine/health.js';
import { formatBytes, formatMiB } from '../engine/health.js';
import type { CurrentWorkView, ServiceSnapshot } from '../engine/snapshot.js';
import { TASK_SORT_FIELDS, describeTaskFilter, filterTasks, groupSupportingWork, isSupportingWork, isTaskFilterActive, sortTasks, type TaskFilter, type TaskInventoryItem, type TaskSortField } from '../tasks/views.js';
import { highlightKinds } from '../book/highlight.js';
import { bookHighlightStyle, terminalSafe, truncate, wrap } from './ansi.js';
import { activityLabel, inlineBadge, type BadgeActivity } from './badges.js';
import {
    browserDetailLines,
    sessionDetailLines,
    sessionRowLine,
    healthDetailLines,
    healthPauseReasons,
    lifecycleActions,
    lifecycleExplanation,
    pauseReasonLines,
    syncDetailLines,
    toolDetailLines,
    toolRow,
} from './details.js';
import { billingMix, compactCount, outcomeText, type HomeTile } from './dashboard-home.js';
import type { UsageFilter, UsageRow, UsageSummary, UsageTotals } from '../engine/usage.js';
import { canShowImage, imageSequence, type ImageOverlay } from './terminal-images.js';
import { symbols, type TerminalProfile } from './terminal.js';
import type { WalletView } from '../wallet/wallet.js';
import type { TabControlView } from '../browser/tab-control.js';
import type { HistoryDetail, HistoryView } from '../project/history.js';
import { ACTION_GROUPINGS, ACTION_SORTS, type ActionGrouping, type ActionRow, type ActionSort, type ActionView } from '../engine/action-impact.js';
import type { ActionLinks, ActionSummary } from '../engine/action-log.js';
import type { FileView, FolderView } from '../project/files.js';
import { appDetailLines } from './app-connection.js';
import { keepAwakeLines } from './keep-awake.js';

/**
 * A commit as the History detail page shows it: the original message and its verified provenance links.
 *
 * @private terminal dashboard pages
 */
export type CommitDetailView = HistoryDetail & { readonly links: { readonly tasks: ReadonlyArray<{ readonly name: string; readonly path?: string }>; readonly chats: ReadonlyArray<{ readonly name: string; readonly exists: boolean }> } };

/**
 * The last placed image of an opened file: encoding it again on every repaint of a live page would be wasted work.
 */
const placedImages = new WeakMap<FileView, ImageOverlay>();

/**
 * The image of an opened file, over the blank area below its information line, where this terminal can show it.
 *
 * @private terminal dashboard pages
 */
export function fileImageOverlay(view: FileView | undefined, terminal: TerminalProfile, page: { readonly bodyRow: number; readonly bodyRows: number }): ImageOverlay | undefined {
    if (!view || !terminal.images || !canShowImage(view.image, terminal)) return undefined;
    const area = { columns: Math.max(1, terminal.columns() - 2), rows: page.bodyRows - 2 };
    if (area.rows < 1) return undefined;
    const key = `${view.path}:${view.size}:${page.bodyRow}:${area.columns}x${area.rows}`;
    const placed = placedImages.get(view);
    if (placed?.key === key) return placed;
    const shown = imageSequence(view.image, terminal.images, area);
    if (!shown) return undefined;
    const overlay: ImageOverlay = { key, row: page.bodyRow + 2, column: 1, rows: area.rows, ...shown };
    placedImages.set(view, overlay);
    return overlay;
}

/**
 * Readable terminal lines of a project file: Markdown with emphasized headings, JSON with colored keys, text as it is
 * (always made terminal-safe; formatting never changes the file). Images and videos are identified honestly.
 *
 * @private terminal dashboard pages
 */
export function fileLines(view: FileView, terminal: Pick<TerminalProfile, 'style' | 'images' | 'reducedMotion'>, width: number): string[] {
    const { style } = terminal;
    const size = formatBytes(view.size);
    if (view.kind === 'image') {
        const info = `${view.mime ?? 'Image'} · ${size}`;
        if (canShowImage(view.image, terminal)) return [info];
        return [info, style.muted(terminal.images ? (view.image ? 'This terminal cannot show this image type; the browser dashboard displays it.' : 'This image is too large to show; the file itself is unchanged.') : 'This terminal view shows file information only; the browser dashboard displays the image.')];
    }
    if (view.kind === 'video') return [`Video · ${size}`, style.muted('Video playback is not part of Files; the file is identified only.')];
    if (view.kind === 'binary' || view.text === undefined) return [`Binary file · ${size}`, style.muted('Not shown as text.')];
    const text = view.text.replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    // Books use the shared highlighting from the one Book parser (the same ranges as every other Book surface).
    if (view.kind === 'book') {
        const kinds = highlightKinds(text);
        let offset = 0;
        const body = lines.flatMap((raw) => {
            const start = offset;
            offset += raw.length + 1;
            let styled = '';
            for (let index = 0; index < raw.length; ) {
                const kind = kinds[start + index];
                let end = index + 1;
                while (end < raw.length && kinds[start + end] === kind) end++;
                const piece = terminalSafe(raw.slice(index, end));
                styled += kind && style.enabled ? bookHighlightStyle(kind, style)(piece) : piece;
                index = end;
            }
            return wrap(styled, width);
        });
        return view.truncated ? [...body, '', style.warning(`Only the beginning of this ${size} file is shown; the rest stays on disk.`)] : body;
    }
    const body = lines.flatMap((raw) => {
        const line = terminalSafe(raw);
        if (view.kind === 'markdown') {
            if (/^#{1,6} /.test(line)) return wrap(style.bold(line.replace(/^#+ /, '')), width);
            if (/^\s*```/.test(line)) return [style.muted(line)];
        }
        if (view.kind === 'json') return wrap(line.replace(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:)/, (_match, indent: string, key: string, colon: string) => `${indent}${style.accent(key)}${colon}`), width);
        return wrap(line, width);
    });
    return view.truncated ? [...body, '', style.warning(`Only the beginning of this ${size} file is shown; the rest stays on disk.`)] : body;
}

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
    | { readonly kind: 'harnesses'; scroll: number; focus: number; selected?: string; ended: boolean; detail: boolean }
    | { readonly kind: 'system'; scroll: number }
    | { readonly kind: 'health'; scroll: number; cache?: CachePreview; swap?: SwapPlan }
    | { readonly kind: 'wallet'; scroll: number; focus: number; selected?: string }
    | { readonly kind: 'tools'; scroll: number; focus: number; selected?: string }
    | { readonly kind: 'tool'; scroll: number; readonly name: string }
    | { readonly kind: 'agents'; scroll: number; focus: number; selected?: string; detail: boolean; sort: TeamSortField }
    | { readonly kind: 'chats'; scroll: number; focus: number; selected?: string }
    | { readonly kind: 'tasks'; scroll: number; focus: number; selected?: string; sort: TaskSortField; descending: boolean; filter: TaskFilter; detail: boolean; showSupporting: boolean }
    | { readonly kind: 'usage'; scroll: number; focus: number; selected?: string; grouping: UsagePageGrouping; inclusive: boolean; filter: UsageFilter; view?: UsageSummary; problem?: string }
    | {
          readonly kind: 'actions';
          scroll: number;
          focus: number;
          selected?: string;
          grouping: ActionGrouping;
          sort: ActionSort;
          showAll: boolean;
          outcome?: string;
          /** The drilled-down position of this level. */
          readonly agent?: string;
          readonly task?: string;
          readonly batch?: string;
          view?: ActionView;
          problem?: string;
          /** The snapshot revision this level last asked for (a change reloads it). */
          seen?: number;
          /** The latest load, so an answer that arrives late never replaces a newer one. */
          request?: number;
          loadingMore?: boolean;
      }
    | { readonly kind: 'action'; scroll: number; readonly path: string; summary?: ActionSummary; content?: string; links?: ActionLinks; problem?: string }
    | { readonly kind: 'history'; scroll: number; focus: number; selected?: string; view?: HistoryView; problem?: string }
    | { readonly kind: 'commit'; scroll: number; readonly sha: string; detail?: CommitDetailView; problem?: string }
    | { readonly kind: 'files'; scroll: number; focus: number; selected?: string; readonly path: string; view?: FolderView; problem?: string }
    | { readonly kind: 'file'; scroll: number; readonly path: string; view?: FileView; problem?: string }
    | { readonly kind: 'app'; scroll: number }
    | { readonly kind: 'sync'; scroll: number };

/**
 * The selectable rows of the Wallet page: pending login requests first, then saved logins.
 *
 * @private terminal dashboard pages
 */
export function walletItems(
    wallet: WalletView,
): Array<{ readonly kind: 'request'; readonly id: string; readonly origin: string; readonly account?: string; readonly problem: WalletView['pending'][number]['problem']; readonly step: number; readonly seen: boolean } | { readonly kind: 'record'; readonly id: string; readonly origin: string; readonly account: string; readonly testing: boolean; readonly testAwaits?: 'code' | 'approval' | 'takeover' }> {
    return [
        ...wallet.pending.map((action) => ({ kind: 'request' as const, id: action.id, origin: action.origin, problem: action.problem, step: action.step ?? 0, seen: Boolean(action.seenAt), ...(action.account ? { account: action.account } : {}) })),
        ...wallet.records.map((record) => ({ kind: 'record' as const, id: record.id, origin: record.origin, account: record.account, testing: record.testing !== undefined, ...(record.testAwaits ? { testAwaits: record.testAwaits } : {}) })),
    ];
}

/**
 * Groupings of the Usage page, in the order `G` cycles them.
 *
 * @private terminal dashboard pages
 */
export const USAGE_PAGE_GROUPINGS = ['agent', 'harness', 'model', 'work', 'task', 'chat', 'tool'] as const;

/**
 * A grouping of the Usage page.
 *
 * @private terminal dashboard pages
 */
export type UsagePageGrouping = (typeof USAGE_PAGE_GROUPINGS)[number];

/**
 * The last Usage view of this viewer (local presentation state, never a project setting).
 *
 * @private terminal dashboard pages
 */
export const lastUsageView: { grouping: UsagePageGrouping; inclusive: boolean; filter: UsageFilter } = { grouping: 'agent', inclusive: false, filter: {} };

/**
 * The External activity log's last presentation choices (viewer-local, for the next visit in this dashboard).
 *
 * @private terminal dashboard pages
 */
export const lastActionView: { grouping: ActionGrouping; sort: ActionSort; showAll: boolean; outcome?: string } = { grouping: 'default', sort: 'smart', showAll: false };

/**
 * Outcomes the External activity log can filter by, in the order the F key cycles them (the actions worth a look first).
 *
 * @private terminal dashboard pages
 */
export const ACTION_OUTCOME_FILTERS = ['failed', 'uncertain', 'pending', 'partial', 'success', 'not-performed'] as const;

/**
 * Names of the log's views in words.
 */
const ACTION_GROUPING_LABELS: Readonly<Record<ActionGrouping, string>> = { default: 'default (batches collapsed)', ungrouped: 'fully ungrouped', task: 'by task', agent: 'by agent' };

/**
 * Names of the log's orders in words.
 */
const ACTION_SORT_LABELS: Readonly<Record<ActionSort, string>> = { smart: 'smart (impact and age)', time: 'time', impact: 'impact' };

/**
 * The page of the External activity log at one position, with the choices it starts from.
 *
 * @private terminal dashboard pages
 */
export function actionsPage(position: { readonly agent?: string; readonly task?: string; readonly batch?: string } = {}, choices: { readonly grouping: ActionGrouping; readonly sort: ActionSort; readonly showAll: boolean; readonly outcome?: string } = lastActionView): Extract<DashboardPage, { kind: 'actions' }> {
    return { kind: 'actions', scroll: 0, focus: 0, grouping: choices.grouping, sort: choices.sort, showAll: choices.showAll, ...(choices.outcome ? { outcome: choices.outcome } : {}), ...position };
}

/**
 * Next value of a viewer choice, wrapping around.
 *
 * @private terminal dashboard pages
 */
export function nextActionChoice<T>(values: readonly T[], current: T): T {
    return values[(values.indexOf(current) + 1) % values.length]!;
}

/**
 * The next outcome filter: every value in turn, then no filter.
 *
 * @private terminal dashboard pages
 */
export function nextActionOutcome(current: string | undefined): string | undefined {
    return current === undefined ? ACTION_OUTCOME_FILTERS[0] : ACTION_OUTCOME_FILTERS[ACTION_OUTCOME_FILTERS.indexOf(current as (typeof ACTION_OUTCOME_FILTERS)[number]) + 1];
}

/**
 * Re-exported choices the key handler cycles.
 *
 * @private terminal dashboard pages
 */
export { ACTION_GROUPINGS, ACTION_SORTS };

/**
 * Whether a Usage page needs the engine's on-demand summary (a filter, or a grouping the snapshot does not carry).
 *
 * @private terminal dashboard pages
 */
export function usageNeedsQuery(page: Extract<DashboardPage, { kind: 'usage' }>): boolean {
    return Object.keys(page.filter).length > 0 || !['agent', 'harness', 'model', 'work'].includes(page.grouping);
}

/**
 * The usage numbers a Usage page shows: the snapshot's live seven-day overview, or the on-demand summary matching its
 * grouping, scope and filter (undefined while that is loading).
 *
 * @private terminal dashboard pages
 */
export function usagePageData(snapshot: ServiceSnapshot, page: Extract<DashboardPage, { kind: 'usage' }>): { readonly days: number; readonly from: string; readonly total: UsageTotals; readonly rows: readonly UsageRow[] } | undefined {
    if (!usageNeedsQuery(page)) {
        const usage = snapshot.usage;
        if (!usage) return undefined;
        const grouping = page.grouping as 'agent' | 'harness' | 'model' | 'work';
        return { days: usage.days, from: usage.from, total: usage.total, rows: grouping === 'agent' ? (page.inclusive ? usage.breakdowns.agentInclusive : usage.breakdowns.agent) : usage.breakdowns[grouping] };
    }
    const view = page.view;
    const scope = page.inclusive ? 'inclusive' : 'self';
    if (!view || view.grouping !== page.grouping || view.scope !== scope || JSON.stringify(view.filter) !== JSON.stringify(page.filter)) return undefined;
    return view;
}

/**
 * Human description of a usage filter, e.g. `agent Developer, task Write docs`.
 *
 * @private terminal dashboard pages
 */
export function describeUsageFilter(filter: UsageFilter): string {
    return Object.entries(filter)
        .map(([field, value]) => `${field === 'work' ? 'kind' : field} ${value}`)
        .join(', ');
}

/**
 * A fresh page for a home tile.
 *
 * @private terminal dashboard pages
 */
export function pageForTile(tile: HomeTile): DashboardPage {
    switch (tile) {
        case 'harnesses':
            return { kind: 'harnesses', scroll: 0, focus: 0, ended: false, detail: false };
        case 'tools':
            return { kind: 'tools', scroll: 0, focus: 0 };
        case 'wallet':
            return { kind: 'wallet', scroll: 0, focus: 0 };
        case 'agents':
            return { kind: 'agents', scroll: 0, focus: 0, detail: false, sort: 'activity' };
        case 'chats':
            return { kind: 'chats', scroll: 0, focus: 0 };
        case 'tasks':
            return { kind: 'tasks', scroll: 0, focus: 0, sort: 'smart', descending: false, filter: {}, detail: false, showSupporting: false };
        case 'usage':
            return { kind: 'usage', scroll: 0, focus: 0, grouping: lastUsageView.grouping, inclusive: lastUsageView.inclusive, filter: lastUsageView.filter };
        case 'actions':
            return actionsPage();
        case 'history':
            return { kind: 'history', scroll: 0, focus: 0 };
        case 'files':
            return { kind: 'files', scroll: 0, focus: 0, path: '' };
        default:
            return { kind: tile, scroll: 0 };
    }
}

/**
 * Whether a tab control is over (returned, ended or lost).
 */
function controlOver(control: TabControlView): boolean {
    return control.state === 'returned' || control.state === 'ended' || control.state === 'lost';
}

/**
 * Indented lines of one user-controlled tab: who has it and whether it awaits the handoff, the viewer (and this
 * terminal's launch link while it waits), limitations, Wallet's sign-in state and save offer, and the outcome.
 */
function tabControlLines(control: TabControlView, context: PageContext, style: TerminalProfile['style']): string[] {
    const local = context.viewers?.get(control.id);
    const viewer = local
        ? local.state === 'attached'
            ? 'viewer open here'
            : local.state === 'waiting'
              ? 'Waiting for browser'
              : local.state === 'expired'
                ? 'viewer link expired (V for a fresh one)'
                : 'viewer closed (V reopens it)'
        : control.viewer === 'connected'
          ? 'viewer open in another window'
          : 'no viewer open (V opens one)';
    const lines: string[] = [];
    if (controlOver(control)) {
        lines.push(style.muted(`      ${control.state === 'returned' ? 'Handed back' : control.state === 'lost' ? 'Control lost' : 'Use ended'}${control.endedAt ? ` ${formatShortTime(Date.parse(control.endedAt))}` : ''}: ${control.outcome ?? control.problem ?? ''}`));
        return lines;
    }
    lines.push(`      ${style.warning('You control this tab')}${style.muted(` · ${control.mode} · ${viewer} · awaiting your handoff${control.url ? ` · ${terminalSafe(control.url)}` : ''}`)}`);
    if (local && (local.state === 'waiting' || local.state === 'expired')) lines.push(style.muted(`      Viewer: ${local.url}`));
    for (const limitation of control.limitations) lines.push(style.warning(`      ${limitation}`));
    if (control.signIn?.detected) lines.push(style.success(`      Sign-in to ${control.signIn.origin ?? 'the service'} detected; the tab stays with you until you return it (H).`));
    if (control.offer) lines.push(`      ${style.bold(control.offer.kind === 'update' ? 'Update password in Wallet?' : 'Save to Wallet?')} ${terminalSafe(control.offer.account)} for ${control.offer.origin} ${style.muted('· Y yes · N no')}`);
    if (control.requestSettled) lines.push(style.muted(`      ${control.requestSettled}`));
    if (control.problem) lines.push(style.warning(`      ${control.problem}`));
    else if (control.outcome) lines.push(style.muted(`      ${control.outcome}`));
    return lines;
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
    /** This invocation owns the engine (foreground). */
    readonly owning: boolean;
    /** Tab viewers this terminal presents (by tab-control id): their launch link and surface state. */
    readonly viewers?: ReadonlyMap<string, { readonly url: string; readonly state: string }>;
    /** This client can present live tab control (a local terminal attached to the engine). */
    readonly tabControl?: boolean;
};

/**
 * A rendered page body: its title/context, all lines, the row to keep visible and the page's own keys.
 *
 * @private terminal dashboard pages
 */
export type PageBody = { readonly title: string; readonly context: string; readonly body: string[]; readonly anchor?: number; readonly legend: string };

/**
 * Recent errors listed on the Harnesses page.
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
    return (inventory ?? []).filter((item) => item.agent?.replace(/^@|^\{|\}$/g, '').toLowerCase() === name.toLowerCase() && !['done', 'cancelled', 'retired'].includes(item.readiness));
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
 * The viewer's current task presentation: filtered and ordered, content and unclassified work first, supporting
 * system work as a lower group collapsed unless shown.
 *
 * @private terminal dashboard pages
 */
export function taskPresentation(context: Pick<PageContext, 'snapshot' | 'inventory'>, page: Extract<DashboardPage, { kind: 'tasks' }>): ReturnType<typeof groupSupportingWork> {
    const ordered = sortTasks(filterTasks(context.inventory ?? [], page.filter), page.sort, page.descending, Date.parse(context.snapshot.observedAt));
    return groupSupportingWork(ordered, { showSupporting: page.showSupporting, filter: page.filter });
}

/**
 * The viewer's current task order (the rows the focus moves through).
 *
 * @private terminal dashboard pages
 */
export function taskOrder(context: Pick<PageContext, 'snapshot' | 'inventory'>, page: Extract<DashboardPage, { kind: 'tasks' }>): TaskInventoryItem[] {
    return taskPresentation(context, page).items;
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
        case 'harnesses': {
            const body: string[] = [];
            const inventory = snapshot.harnessSessions;
            const rows = page.ended ? (inventory?.ended ?? []) : (inventory?.open ?? []);
            const selected = rows[Math.max(0, Math.min(page.focus, rows.length - 1))];
            const legend = (entry: boolean): string => ` ↑↓ select · Enter ${page.detail ? 'back to the list' : 'details'}${entry ? ' · N enter the session…' : ''} · E ${page.ended ? 'open sessions' : 'ended sessions'} · ${back}`;
            if (page.detail && selected) {
                body.push(...sessionDetailLines(selected, style, sessionReceiptLines(snapshot, selected)));
                return { title: 'Harnesses', context: `The session of ${selected.agent}. Opening this is inspection only; nothing was entered.`, body, legend: legend(!selected.endedAt) };
            }
            const counts = inventory?.counts;
            if (counts) body.push(`${style.muted('Sessions ')} ${style.bold(String(counts.open))} open${style.muted(` · ${counts.working} working · ${counts.idle} idle · ${counts.waiting} waiting${inventory?.ended.length ? ` · ${inventory.ended.length} ended (retained)` : ''}`)}`);
            let anchor: number | undefined;
            body.push('', style.bold(page.ended ? `Ended sessions, retained as evidence (${rows.length})` : `Open sessions (${rows.length})`));
            if (!rows.length) body.push(style.muted(page.ended ? 'No ended session retained.' : snapshot.phase === 'unknown' ? 'Unavailable: the service runs another ptbk version.' : 'No session is open. A session opens when an agent starts work or replies in a chat.'));
            rows.forEach((session, index) => {
                if (index === page.focus) anchor = body.length;
                body.push(`${pointer(index === page.focus)} ${sessionRowLine(session, style)}`);
            });
            if (!page.ended) {
                const active = activeWork(snapshot).filter((item) => item.kind !== 'chat');
                if (active.length) {
                    body.push('', style.bold('Work in progress'));
                    for (const item of active) body.push(`  ${inlineBadge(item.agent.name, item.agent.activity, style, terminal.reducedMotion ? 0 : context.frame)} ${item.taskTitle} ${style.muted(`· ${item.phase}${item.attempt ? ` ${item.attempt}/${item.attemptBudget}` : ''}${item.detail ? ` · ${item.detail}` : ''}${item.trace ? ` · trace ${item.trace}` : ''}`)}`);
                }
                const workload = snapshot.workload;
                if (workload && (workload.waiting || workload.queued)) body.push(style.muted(`  ${workload.waiting} waiting · ${workload.queued} queued`));
                if (snapshot.wait) {
                    body.push('', `${style.warning(marks.wait)} ${snapshot.wait.reason}${snapshot.wait.until ? style.muted(` · until ${time(snapshot.wait.until)}`) : ''}${snapshot.wait.skippable ? style.muted(' · S skips the wait') : ''}`);
                    if (snapshot.wait.action) body.push(`${style.accent(marks.arrow)} ${snapshot.wait.action}`);
                }
                for (const blocker of snapshot.blockers) {
                    body.push('', `${style.error(marks.fail)} ${style.bold(blocker.title)}: ${blocker.reason}`);
                    if (blocker.action) body.push(`  ${style.accent(marks.arrow)} ${blocker.action}${blocker.recheckAt ? style.muted(` · recheck ${time(blocker.recheckAt)}`) : ''}`);
                }
                const failing = (snapshot.browsers?.length ? snapshot.browsers : snapshot.browser ? [snapshot.browser] : []).filter((browser) => (browser.state === 'failed' || browser.recovery?.state === 'blocked') && browser.lastFailure);
                for (const browser of failing) body.push('', `${style.error(marks.fail)} ${style.bold(`Browser ${browser.name}`)}: ${browser.lastFailure!.summary}${style.muted(' · T opens Tools')}`);
                const errors = snapshot.errors.slice(-RECENT_ERRORS);
                if (errors.length) body.push('', style.bold('Recent errors'), ...errors.flatMap((error) => [`${style.muted(time(error.at))} ${style.error(error.summary)}`, ...(error.next ? [style.muted(`  ${error.next}`)] : [])]));
            }
            return { title: 'Harnesses', context: 'Every open harness session of your agents, including idle ones; Enter shows one in detail', body, anchor, legend: legend(false) };
        }
        case 'system': {
            const { service, engine } = snapshot;
            const reasons = service.pauseReasons ?? [];
            const actions = lifecycleActions(snapshot).filter((action) => action.key);
            const health = healthPauseReasons(snapshot);
            const body = [
                style.bold('Lifecycle'),
                `${style.muted('State     ')} ${service.state === 'running' ? style.success(service.state) : style.warning(service.state)} — ${lifecycleExplanation(snapshot)}`,
                ...(service.lifecycle?.intent ? [`${style.muted('Pending   ')} ${service.lifecycle.intent}${service.lifecycle.settling ? ' (active work is settling)' : ''}${service.lifecycle.since ? style.muted(` · since ${time(service.lifecycle.since)}`) : ''}${service.lifecycle.cancellable ? style.muted(' · U cancels') : ''}`] : []),
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
                `${style.muted('Persistent')} ${service.persistent === null ? 'n/a' : service.persistent ? 'yes (restored at OS startup)' : style.warning('no')}${service.persistenceNote ? style.muted(` · ${service.persistenceNote}`) : ''}`,
                `${style.muted('Config    ')} promptbookVersion ${snapshot.configuration?.promptbookVersion ?? style.muted('unknown')}${snapshot.configuration?.pending ? style.warning(` · pending: ${snapshot.configuration.pending}`) : ''}`,
                ...(snapshot.update ? ['', ...engineUpdateLines(snapshot.update, style, time)] : []),
                // Power on the engine host: the shared Keep awake operation (viewing it never acquires anything).
                ...(snapshot.keepAwake ? ['', style.bold('Power · Keep awake'), ...keepAwakeLines(snapshot.keepAwake, style, time, { working: Boolean(snapshot.active?.length) })] : []),
                '',
                style.bold(`Effective settings (${snapshot.settings.length})`),
                ...snapshot.settings.map((setting) => `  ${setting.key.padEnd(SETTING_KEY_WIDTH)} ${setting.value}${style.muted(` · ${setting.source}${setting.application !== 'live' ? ` · applies ${setting.application}` : ''}`)}`),
                '',
                // The general operational log: runtime events, current/last errors and automatic repair progress.
                // Inspectable here without attention; each task keeps its own outcome in Tasks.
                style.bold(`Operational log (${snapshot.activity.length})`),
                ...(snapshot.activity.length ? snapshot.activity.map((line) => `${style.muted(time(line.at))} ${line.level === 'error' ? style.error(line.text) : line.level === 'warning' ? style.warning(line.text) : line.text}`) : [style.muted('No runtime events yet.')]),
                ...(snapshot.errors.length ? ['', style.bold('Recent errors'), ...snapshot.errors.slice(-5).flatMap((error) => [`${style.muted(time(error.at))} ${style.error(error.summary)}`, ...(error.next ? [style.muted(`      next: ${error.next}`)] : [])])] : []),
            ];
            const update = snapshot.update;
            const updateKeys = update ? `A turn automatic updates ${update.policy.isAutoUpdateEnabled ? 'off' : 'on'}${update.isSupported ? ' · C check for a release now' : ''} · ` : '';
            const awake = snapshot.keepAwake;
            const powerKeys = awake ? `K keep awake: ${awake.mode === 'off' ? 'two hours' : awake.mode === 'limited' ? 'always' : 'off'}${awake.lid.capability !== 'unavailable' ? ` · L closed lid ${awake.closedLid ? 'off' : 'on'}` : ''} · ` : '';
            return { title: 'System', context: 'Engine identity, lifecycle, every active pause reason, manual controls, automatic updates and keep awake', body, legend: `${actions.map((action) => `${action.key} ${action.label}`).join(' · ')}${actions.length ? ' · ' : ''}${updateKeys}${powerKeys}↑↓ scroll · ${back}` };
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
        case 'wallet': {
            const wallet = snapshot.wallet;
            if (!wallet) return { title: 'Wallet', context: 'Website logins of this project', body: [style.muted('This engine does not report a Wallet (another ptbk version).')], legend: back };
            const items = walletItems(wallet);
            const time = (iso?: string): string => (iso ? formatShortTime(Date.parse(iso)) : '');
            const body: string[] = [
                `${style.muted('State     ')} ${wallet.state === 'ready' ? style.success(wallet.summary) : wallet.state === 'unavailable' ? style.error(wallet.summary) : style.warning(wallet.summary)}`,
                ...(wallet.facility ? [`${style.muted('Unlock    ')} automatic on this computer (${wallet.facility})`] : []),
                ...(wallet.problem ? [style.warning(wallet.problem)] : []),
                '',
                style.bold(`Login requests waiting (${wallet.pending.length})`),
            ];
            let index = 0;
            let anchor = 0;
            /** The row of the next selectable item (the focused one is the scroll anchor). */
            const row = (): string => {
                const focused = index++ === page.focus;
                if (focused) anchor = body.length;
                return pointer(focused);
            };
            for (const action of wallet.pending) {
                const problem =
                    action.problem === 'rejected'
                        ? 'the saved login was rejected'
                        : action.problem === 'locked'
                          ? 'restore the Wallet first'
                          : action.problem === 'code'
                            ? 'a one-time code is needed'
                            : action.problem === 'field'
                              ? `the login form asks for ${(action.fields ?? []).join(', ') || 'more fields'}`
                              : 'no saved login';
                // A request marked as seen keeps waiting here; only its alert ended.
                body.push(`${row()} ${action.origin}${action.account ? ` · ${action.account}` : ''} ${style.warning(`· ${problem}`)}${style.muted(` · ${action.tasks.length ? `for ${action.tasks.join(', ')}` : 'requested'} · since ${time(action.createdAt)}${action.requests > 1 ? ` · ${action.requests}×` : ''}`)}${action.seenAt ? style.muted(` · seen ${time(action.seenAt)}, still waiting`) : style.warning(' · new')}`);
                // Authentication (this request) and tab ownership (its manual sign-in) are separate states.
                const control = [...(snapshot.tabControls ?? [])].reverse().find((candidate) => candidate.request === action.id);
                if (control) body.push(...tabControlLines(control, context, style));
            }
            if (!wallet.pending.length) body.push(style.muted('  Nothing waits for a login.'));
            body.push('', style.bold(`Saved logins (${wallet.lockedRecords ?? wallet.records.length})`));
            if (wallet.lockedRecords) body.push(style.muted('  Their services, accounts and labels are encrypted too; they appear once this computer unlocks the Wallet.'));
            for (const record of wallet.records) {
                const verification = record.verification;
                const tested = record.testing
                    ? style.warning(` · testing: ${record.testing}${record.testAwaits ? '' : '…'}`)
                    : verification?.state === 'verified'
                      ? style.success(` · verified ${time(verification.at)}`)
                      : verification?.state === 'rejected'
                        ? style.error(` · test rejected ${time(verification.at)}`)
                        : verification
                          ? style.warning(` · unverified (test incomplete ${time(verification.at)})`)
                          : style.muted(' · unverified');
                body.push(`${row()} ${record.origin} · ${record.account}${record.lastUsedAt ? style.muted(` · used ${time(record.lastUsedAt)}`) : ''}${record.lastOutcome === 'rejected' ? style.warning(' · rejected by the site') : ''}${tested}`);
                // Only the names of additional fields: their values stay encrypted like the password.
                if (record.fields?.length) body.push(style.muted(`      Also fills: ${record.fields.map((field) => `${field.label}${field.uncertain ? ' (may change)' : ''}`).join(', ')}`));
                // The concise reason of an unsuccessful latest test stays visible with its login.
                if (!record.testing && verification && verification.state !== 'verified') body.push(style.muted(`      ${verification.reason}`));
            }
            if (!wallet.records.length) body.push(style.muted(wallet.state === 'ready' ? '  No saved logins; press N to add one.' : '  None.'));
            if (wallet.lastAction) body.push('', style.muted(`Last: ${wallet.lastAction.outcome}`));
            body.push('', style.muted('Agents never receive passwords: the Wallet signs in for them. Passwords, the 12 words for recovery and keys are never shown here.'));
            const focused = items[page.focus];
            // Mark as seen and Reject request apply to a focused request in every Wallet state; opening the page does neither.
            const manual = focused?.kind === 'request' ? (snapshot.tabControls ?? []).find((control) => control.request === focused.id && !controlOver(control)) : undefined;
            const manualKeys = focused?.kind !== 'request' || !context.tabControl ? [] : manual ? [...(manual.offer ? ['Y save · N don’t save'] : []), 'H return control to agent', 'V reopen viewer', 'E end use'] : ['B sign in manually'];
            const requestKeys = focused?.kind === 'request' ? [...manualKeys, ...(focused.seen ? [] : ['M mark as seen']), 'X reject request'] : [];
            const keys = [
                ...requestKeys,
                ...(wallet.state === 'empty' || wallet.state === 'setup'
                    ? ['S set up (shows 12 words for recovery once)']
                    : wallet.state === 'locked' || wallet.state === 'unavailable'
                      ? [...(wallet.state === 'locked' ? ['R restore with the 12 words for recovery'] : []), ...(wallet.management?.canReset ? ['Z reset (no key: all old logins are lost)'] : [])]
                      : wallet.state === 'ready'
                        ? [
                              ...(manual?.offer ? [] : ['N add login']),
                              'I import from Bitwarden',
                              'G new 12 words',
                              ...(focused
                                  ? [focused.kind === 'request' ? (focused.problem === 'code' ? 'Enter type the code' : focused.problem === 'field' ? 'Enter add the fields' : 'Enter add this login') : focused.testAwaits === 'code' ? 'Enter type the code · X cancel the test' : focused.testing ? 'X cancel the test · D remove' : 'Enter update · T test · D remove']
                                  : []),
                          ]
                        : []),
            ];
            return { title: 'Wallet', context: 'Website logins of this project, encrypted in .ptbk/wallet/ and applied for agents without showing them the credentials', body, anchor, legend: `${keys.join(' · ')}${keys.length ? ' · ' : ''}↑↓ choose · ${back}` };
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
            if (item.type === 'COMPUTER_CONTROL') body.push('', '1 request native OS permissions · 2 pause input and observation · 3 resume · 4 stop session-wide · 5 check status', 'Human input always takes priority. A manual pause stays paused until you resume it.');
            const controls = item.type === 'BROWSER' ? (snapshot.tabControls ?? []).filter((control) => control.browser === item.name) : [];
            if (controls.length) {
                body.push('', style.bold('Tabs you control'));
                for (const control of controls) {
                    body.push(`  ${control.purpose === 'wallet' ? 'Manual sign-in' : 'Tab'}${control.task ? style.muted(` · taken from ${control.task}`) : ''}${control.title ? ` · ${terminalSafe(control.title)}` : ''}`);
                    body.push(...tabControlLines(control, context, style));
                }
            }
            const live = controls.some((control) => !controlOver(control));
            const tabKeys = item.type === 'BROWSER' && context.tabControl ? ` · 6 take control of a tab${live ? ' · H return control to agent · V reopen viewer · E end use' : ''}` : '';
            return { title: `Tools › ${item.name}`, context: `${item.variantLabel} · ${item.type} ${item.variant}`, body, legend: `Space enable/disable · M modify · D remove${item.type === 'BROWSER' ? ' · 1 recheck · 2 retry · 3 restart · 4 kill · 5 test GitHub tab' : item.type === 'COMPUTER_CONTROL' ? ' · 1 permissions · 2 pause · 3 resume · 4 stop · 5 status' : ''}${tabKeys} · ${back}` };
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
        case 'actions': {
            const actions = snapshot.actions;
            const view = page.view;
            const title = ['External activity log', ...(view?.path ?? []).map((item) => terminalSafe(item.label))].join(' › ');
            if (!actions) return { title, context: 'This engine does not report external actions yet.', body: [style.muted('Not available.')], legend: back };
            if (page.problem) return { title, context: 'Saved external action records', body: [style.warning(`The log could not be read: ${page.problem}`)], legend: back };
            if (!view) return { title, context: 'Reading saved records…', body: [style.muted('Loading…')], legend: back };
            const body: string[] = [];
            let anchor = 0;
            let unranked = false;
            view.rows.forEach((row, index) => {
                // Unknown has its own labelled position instead of a fabricated rank.
                if (view.sort !== 'time' && !unranked && (view.sort === 'smart' ? row.totals.priority : row.totals.impact) === undefined) {
                    unranked = true;
                    if (index) body.push('');
                    body.push(style.muted('Unknown impact · not ranked by a number'));
                }
                if (index === page.focus) anchor = body.length;
                body.push(actionRowLine(row, index === page.focus, pointer, style));
            });
            if (!view.rows.length) {
                if (view.hidden) body.push(style.muted(`${view.hidden} row${view.hidden === 1 ? ' is' : 's are'} below impact ${view.cutoff}; A shows all.`));
                else if (view.outcome) body.push(style.muted(`No action has the outcome ${view.outcome}; X clears the filter.`));
                else body.push(style.muted('No external action has been recorded. Records are captured from now on; earlier tasks may have external work without a record.'));
            }
            if (view.rows.length < view.totalRows) body.push('', style.muted(`… ${view.totalRows - view.rows.length} more load as you move down`));
            const top = !view.path.length;
            return {
                title,
                context: [
                    ...(top ? [`View ${ACTION_GROUPING_LABELS[view.grouping]}`] : []),
                    `order ${ACTION_SORT_LABELS[view.sort]}`,
                    ...(top ? [view.cutoff === undefined ? 'every impact' : `impact ≥ ${view.cutoff}${view.hidden ? ` (${view.hidden} below)` : ''}`] : []),
                    ...(view.outcome ? [`only ${view.outcome}`] : []),
                    `${view.totals.filtered ? `${view.totals.count} of ${view.totals.unfiltered}` : view.totals.count} action${view.totals.unfiltered === 1 ? '' : 's'}, impact ${view.totals.display}`,
                    ...(actions.pending ? [`${actions.pending} not committed`] : []),
                    ...(actions.unresolved ? [`${actions.unresolved} without a reported outcome`] : []),
                ].join(' · '),
                body,
                anchor,
                legend: `↑↓ choose · Enter open · ${top ? 'G view · ' : ''}S order · ${top ? `A ${view.showAll ? 'apply the cutoff' : 'show all'} · ` : ''}F outcome${view.outcome ? ' · X clear filter' : ''} · ${back}`,
            };
        }
        case 'action': {
            const item = page.summary;
            const body = page.problem ? [style.warning(page.problem)] : page.content === undefined ? [style.muted('Loading…')] : page.content.split(/\r?\n/).flatMap((line) => wrap(terminalSafe(line), Math.max(20, width - 2)));
            return {
                title: `External activity log › ${item ? terminalSafe(item.operation) : page.path.split('/').pop()}`,
                context: `${page.path}${item?.pending ? ' · saved, not committed yet' : ''}${page.links?.receipt ? ` · receipt ${terminalSafe(page.links.receipt)}` : ''}`,
                body,
                // Only verified links: a task Book, evidence or session no longer known is not offered.
                legend: `↑↓ scroll · ${page.links?.task ? 'E open the task Book · ' : ''}${page.links?.evidence ? 'T open the evidence · ' : ''}${page.links?.harness ? 'H open the harness session · ' : ''}${back}`,
            };
        }
        case 'history': {
            if (page.problem) return { title: 'History', context: 'Git history', body: [style.warning(page.problem)], legend: back };
            const view = page.view;
            if (!view) return { title: 'History', context: 'Reading the local Git history…', body: [style.muted('Loading…')], legend: back };
            if (view.problem) return { title: 'History', context: view.branch ?? 'Git history', body: [style.muted(view.problem)], legend: back };
            const body: string[] = [];
            let index = 0;
            let anchor = 0;
            for (const row of view.rows) {
                if (!row.commit) {
                    body.push(style.muted(`  ${row.graph}`));
                    continue;
                }
                const focused = index === page.focus;
                if (focused) anchor = body.length;
                const commit = row.commit;
                const who = commit.kind === 'agent' ? style.accent(`\`${commit.visual}\` `) : commit.kind === 'foreign' ? style.muted(`${commit.author}: `) : '';
                const refs = commit.refs.length ? style.warning(` (${commit.refs.join(', ')})`) : '';
                body.push(`${pointer(focused)} ${style.muted(row.graph)} ${style.muted(formatShortTime(Date.parse(commit.at)))} ${who}${commit.kind === 'legacy' ? style.muted('ptbk ') : ''}${terminalSafe(commit.summary)}${refs}`);
                index++;
            }
            if (view.more) body.push('', style.muted('… older commits are not shown here (git log has the complete history).'));
            if (view.shallow) body.push('', style.warning('This is a shallow clone: older history is not available locally.'));
            return { title: 'History', context: `${view.branch ?? 'HEAD'} · ${index} commit${index === 1 ? '' : 's'} · messages and topology, read-only (never fetches)`, body, anchor, legend: `↑↓ choose · Enter open the full message · ${back}` };
        }
        case 'commit': {
            if (page.problem) return { title: 'History › commit', context: page.sha.slice(0, 12), body: [style.warning(page.problem)], legend: back };
            const detail = page.detail;
            if (!detail) return { title: 'History › commit', context: page.sha.slice(0, 12), body: [style.muted('Loading…')], legend: back };
            const body = [
                `${style.muted('Commit')} ${detail.sha}`,
                `${style.muted('Author')} ${terminalSafe(detail.author)} <${terminalSafe(detail.email)}> · ${detail.at}`,
                ...(detail.parents.length > 1 ? [`${style.muted('Merge of')} ${detail.parents.map((parent) => parent.slice(0, 10)).join(', ')}`] : detail.parents.length ? [`${style.muted('Parent')} ${detail.parents[0]!.slice(0, 10)}`] : [style.muted('Root commit')]),
                ...(detail.refs.length ? [`${style.muted('Refs')} ${detail.refs.join(', ')}`] : []),
                ...detail.links.tasks.map((task) => `${style.muted('Task')} {${task.name}} ${task.path ? style.success(`${task.path} · E opens it`) : style.muted('(no longer in the project)')}`),
                ...detail.links.chats.map((chat) => `${style.muted('Chat')} {${chat.name}} ${chat.exists ? style.success('C opens it') : style.muted('(no longer in the project)')}`),
                '',
                ...detail.message.split('\n').flatMap((line) => wrap(terminalSafe(line), Math.max(20, width - 2))),
            ];
            return { title: `History › ${detail.sha.slice(0, 10)}`, context: detail.kind === 'agent' ? `agent work · ${detail.visual}` : detail.kind === 'system' ? 'Promptbook system operation' : detail.kind === 'legacy' ? 'legacy ptbk subject' : 'ordinary commit', body, legend: `↑↓ scroll · ${detail.links.tasks.some((task) => task.path) ? 'E open the task · ' : ''}${detail.links.chats.some((chat) => chat.exists) ? 'C open the chat · ' : ''}${back}` };
        }
        case 'files': {
            const location = page.path || '.';
            if (page.problem) return { title: `Files › ${location}`, context: 'Read-only project browser', body: [style.warning(page.problem)], legend: back };
            const view = page.view;
            if (!view) return { title: `Files › ${location}`, context: 'Read-only project browser', body: [style.muted('Loading…')], legend: back };
            const body = view.entries.map((entry, index) => {
                const label = entry.type === 'directory' ? style.bold(`${terminalSafe(entry.name)}/`) : entry.type === 'link-outside' ? style.muted(`${terminalSafe(entry.name)} → outside the project (not followed)`) : terminalSafe(entry.name);
                const details = entry.type === 'file' ? style.muted(` · ${entry.kind} · ${formatBytes(entry.size ?? 0)}${entry.modifiedAt ? ` · ${formatShortTime(Date.parse(entry.modifiedAt))}` : ''}`) : '';
                return `${pointer(index === page.focus)} ${label}${details}`;
            });
            if (!view.entries.length) body.push(style.muted('This folder has no visible entries.'));
            if (view.truncated) body.push('', style.muted('… more entries are not listed.'));
            return { title: `Files › ${location}`, context: 'Read-only · hidden and protected paths (.git, .ptbk, .env …) are never shown; agent Book folders such as agents/.core are', body, anchor: page.focus, legend: `↑↓ choose · Enter open · ${back}` };
        }
        case 'file': {
            if (page.problem) return { title: `Files › ${page.path}`, context: 'Read-only', body: [style.warning(page.problem)], legend: back };
            const view = page.view;
            if (!view) return { title: `Files › ${page.path}`, context: 'Read-only', body: [style.muted('Loading…')], legend: back };
            return { title: `Files › ${view.path}`, context: `${view.kind} · ${formatBytes(view.size)} · read-only (formatting never changes the file)`, body: fileLines(view, terminal, Math.max(20, width - 2)), legend: `↑↓ scroll · ${back}` };
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
            const presentation = taskPresentation(context, page);
            const items = presentation.items;
            const body: string[] = [];
            let anchor = 0;
            items.forEach((item, index) => {
                const when = item.until ? `next ${formatShortTime(Date.parse(item.until))}` : item.lastDone ? `done ${formatShortTime(Date.parse(item.lastDone))}` : '';
                if (index === presentation.firstSupporting) body.push('', style.muted(`Supporting system work (${presentation.supporting}) · muted, scheduled as usual · W hides it`));
                if (index === page.focus) anchor = body.length;
                const engine = item.kind === 'engine';
                // Supporting system work is muted; a human request on it stays conspicuous.
                const title = isSupportingWork(item) ? style.muted(item.title) : item.title;
                body.push(`${pointer(index === page.focus)} ${style.muted(item.readiness.padEnd(16).slice(0, 16))} ${engine ? `${style.muted('[engine]')} ` : ''}${title}${style.muted(`${item.agent ? ` · ${item.agent}` : ''}${item.priority && !engine ? ` · P${item.priority}` : ''}${engine && item.priorityText ? ` · ${item.priorityText} priority` : ''}${item.repeat ? ` · every ${item.repeat}` : ''}${when ? ` · ${when}` : ''}`)}`);
                if (index === page.focus && page.detail) {
                    body.push(
                        `    ${style.muted('Status')} ${item.readiness} — ${item.reason}`,
                        // An engine-owned task has its actual executor instead of a (nonexistent) source Book.
                        engine ? `    ${style.muted('Kind  ')} engine-owned task · executor ${item.executor ?? 'the engine'}${item.origin ? style.muted(` · origin ${item.origin}`) : ''}` : `    ${style.muted('Source')} ${item.source}${item.origin ? style.muted(` · origin ${item.origin}`) : ''}`,
                        // Ownership, purpose and core provenance are independent properties.
                        `    ${style.muted('Purpose')} ${item.purpose ?? 'undefined'}${item.core ? style.muted(' · core agent work') : ''}`,
                        ...(item.model ? [`    ${style.muted('MODEL ')} ${item.model.replace(/\n/g, ' | ')}`] : []),
                        // Definition, this run and its retry stay distinct; finished runs are the system task's own evidence.
                        ...(item.definition ? [`    ${style.muted('Runs  ')} of the definition "${item.definition}"${item.retry ? ` · this is retry ${item.retry} after failed runs` : ''}${item.runs?.length ? '' : style.muted(' · none finished yet')}`] : []),
                        ...(item.runs ?? []).slice(0, 3).map((run) => `      ${run.outcome === 'completed' ? style.success(marks.ok) : style.error(marks.fail)} ${style.muted(formatShortTime(Date.parse(run.at)))} ${truncate(`${run.title} — ${run.detail}`, width - 24)}`),
                    );
                    // Each task keeps its own latest outcome or error (there is no separate results page).
                    const result = snapshot.results.recent.find((candidate) => candidate.ref === item.ref);
                    if (result) body.push(`    ${style.muted('Result')} ${result.outcome.startsWith('completed') ? style.success(result.outcome) : result.outcome === 'failed' ? style.error(result.outcome) : style.warning(result.outcome)} ${style.muted(formatShortTime(Date.parse(result.endedAt)))} ${truncate(result.summary, width - 30)}${result.commit ? style.muted(` · ${result.commit.slice(0, 8)}`) : ''}`);
                    // The task's pending question is the same one its chat shows; answering here answers it there.
                    const question = item.waitingChat ? snapshot.chats.waiting.find((chat) => chat.name === item.waitingChat) : undefined;
                    if (question?.awaiting) body.push(`    ${style.warning(`${marks.warn} ${question.awaiting.sender} asks:`)} ${question.awaiting.text.split('\n').filter(Boolean).at(-1) ?? ''}`, `    ${style.muted(`A answers in {${question.title ?? question.name}}`)}`);
                }
            });
            // Filtering is a view only: clearing it makes every task (distant and completed ones included) reachable again.
            const filtered = isTaskFilterActive(page.filter);
            if (!items.length && !presentation.supporting) body.push(style.muted(filtered ? `No task matches ${describeTaskFilter(page.filter)}; X clears the filter and shows all ${context.inventory.length} tasks.` : 'No tasks yet; press T to talk to Tasker.'));
            if (presentation.supporting && presentation.firstSupporting === undefined) body.push('', style.muted(`Supporting system work: ${presentation.supporting} task${presentation.supporting === 1 ? '' : 's'} (W shows ${presentation.supporting === 1 ? 'it' : 'them'})`));
            return {
                title: 'Tasks',
                context: `${filtered ? `${items.length} of ${context.inventory.length} tasks · filtered by ${describeTaskFilter(page.filter)}` : `${items.length} tasks${presentation.supporting && presentation.firstSupporting === undefined ? ` + ${presentation.supporting} supporting` : ''}`} · ${page.sort === 'smart' ? 'smart order: current, coming up, recent, distant, history' : `sorted by ${page.sort}`}${page.descending ? ' (reversed)' : ''} · viewer order only, never scheduling`,
                body,
                anchor,
                legend: `↑↓ choose · Enter ${page.detail ? 'hide' : 'show'} details · ${items[page.focus]?.waitingChat ? 'A answer · ' : ''}${items[page.focus]?.source ? 'E edit source · O external activity · ' : ''}S sort (${TASK_SORT_FIELDS.length}) · D reverse · F find · R status · G agent · K kind · P purpose · W ${page.showSupporting ? 'hide' : 'show'} system work${filtered ? ' · X clear filter' : ''} · T Tasker · ${back}`,
            };
        }
        case 'usage': {
            const filtered = Object.keys(page.filter).length > 0;
            const data = usagePageData(snapshot, page);
            if (!data) {
                const waiting = page.problem ? style.error(`The usage summary could not be read: ${page.problem}`) : usageNeedsQuery(page) ? style.muted('Loading the usage summary…') : style.muted('This engine does not report usage yet (another ptbk version, or the first summary is still being prepared).');
                return { title: 'Usage', context: filtered ? `Model usage · filtered by ${describeUsageFilter(page.filter)}` : 'Model usage of this project', body: [waiting], legend: `${filtered ? 'X clear filter · ' : ''}${back}` };
            }
            const rows = data.rows;
            const tokens = (row: UsageTotals): string => `${compactCount(row.input)} in · ${compactCount(row.output)} out${row.cachedInput ? ` · ${compactCount(row.cachedInput)} cached` : ''}${row.reasoning ? ` · ${compactCount(row.reasoning)} reasoning` : ''}`;
            const money = (row: UsageTotals): string[] => [
                ...(row.coverage.costReported ? [`$${row.reportedCostUsd.toFixed(2)} reported by providers`] : []),
                ...(row.calculated.apiUsd ? [`$${row.calculated.apiUsd.toFixed(2)} API${row.calculated.estimated ? ' (partly estimated)' : ''}`] : []),
                ...(row.calculated.subscriptionEquivalentUsd ? [`$${row.calculated.subscriptionEquivalentUsd.toFixed(2)} token-price equivalent of subscription work`] : []),
            ];
            const certainty = (row: UsageTotals): string => [billingMix(row), row.coverage.unavailable ? `${row.coverage.unavailable} without reported usage` : '', row.calculated.unpriced && row.coverage.reported ? `${row.calculated.unpriced} not priced` : ''].filter(Boolean).join(' · ');
            const scoped = page.grouping === 'agent' || page.grouping === 'task' || page.grouping === 'chat';
            const heading = { agent: 'By executing agent', harness: 'By harness (tool)', model: 'By model', work: 'By kind of work', task: 'By task', chat: 'By chat', tool: 'By tool' }[page.grouping];
            const body = [
                `${style.muted('Last')} ${data.days} days ${style.muted(`(${formatShortTime(Date.parse(data.from))} – now)`)}`,
                ...(filtered ? [`${style.muted('Only')} ${describeUsageFilter(page.filter)}${style.muted(page.inclusive ? ' (including work it initiated)' : '')}`] : []),
                `${style.bold('Total')}  ${data.total.units ? tokens(data.total) : 'no model usage'}${style.muted(` · ${data.total.units} run${data.total.units === 1 ? '' : 's'}`)}`,
                ...money(data.total).map((line) => `       ${line}`),
                `       ${style.muted(certainty(data.total))}`,
                '',
                style.bold(scoped && page.inclusive ? `${heading}, including work it initiated (rows overlap)` : heading),
            ];
            let anchor = 0;
            const labelWidth = Math.min(28, Math.max(8, ...rows.map((row) => row.label.length)));
            rows.forEach((row, index) => {
                if (index === page.focus) anchor = body.length;
                // A row of missing attribution is shown as such and cannot be narrowed further (never guessed).
                body.push(`${pointer(index === page.focus)} ${(row.filter ? row.label : style.muted(row.label)).padEnd(labelWidth)}  ${tokens(row)}${style.muted(` · ${row.units} run${row.units === 1 ? '' : 's'}`)}`);
                const details = [...money(row), certainty(row)].filter(Boolean);
                if (details.length) body.push(style.muted(`  ${' '.repeat(labelWidth)}  ${details.join(' · ')}`));
            });
            if (!rows.length) body.push(style.muted(filtered ? 'Nothing matches this filter in this period; X clears it.' : 'Nothing in this period.'));
            body.push('', style.muted('Totals count every consumption once and come from durable raw usage (traces/…/usage.jsonl). Missing usage is shown, never counted as zero.'));
            const next = USAGE_PAGE_GROUPINGS[(USAGE_PAGE_GROUPINGS.indexOf(page.grouping) + 1) % USAGE_PAGE_GROUPINGS.length];
            return {
                title: 'Usage',
                context: `Model usage over the last ${data.days} days${filtered ? ` · filtered by ${describeUsageFilter(page.filter)}` : ''} · billing mode and certainty stay visible`,
                body,
                anchor,
                legend: `↑↓ choose · ${rows[page.focus]?.filter ? 'Enter only this · ' : ''}G group by ${next}${scoped || page.filter.agent || page.filter.task || page.filter.chat ? ` · I ${page.inclusive ? 'own work only' : 'include initiated work'}` : ''}${filtered ? ' · X clear filter' : ''} · ${back}`,
            };
        }
        case 'app': {
            const app = snapshot.app;
            const canPair = app && !app.hostname && !['disabled', 'connecting', 'offline'].includes(app.state);
            const canUnpair = app?.hostname && app.state !== 'offline';
            const body = appDetailLines(app, style, width, { interactivePairing: true });
            const pairing = canUnpair ? 'U unpair · ' : canPair ? 'L pair · ' : '';
            return { title: 'App', context: 'This project’s link to the Promptbook App (app.ptbk.io)', body, legend: pairing + '↑↓ scroll · ' + back };
        }
        case 'sync': {
            if (!snapshot.sync) return { title: 'Synchronization', context: 'Automatic synchronization is off (isAutoSync false).', body: [style.muted('Nothing to show while autosync is disabled.')], legend: back };
            return { title: 'Synchronization', context: 'Git autosync with the tracked remote (shared coordinator; never a second scheduler)', body: syncDetailLines(snapshot.sync, style), legend: `G synchronize now · ↑↓ scroll · ${back}` };
        }
    }
}

/**
 * The engine-owned update policy and its system-task progress (the System page owns the on/off switch; progress
 * itself is an ordinary system task in the task views, never a lifecycle state).
 *
 * @private terminal dashboard pages
 */
export function engineUpdateLines(update: NonNullable<ServiceSnapshot['update']>, style: TerminalProfile['style'], time: (iso: string) => string): string[] {
    const major = update.current.replace(/^v/, '').split('.')[0];
    const lines = [
        style.bold('Engine updates'),
        `${style.muted('Automatic ')} ${update.policy.isAutoUpdateEnabled ? style.success('on') : style.warning('off')}${style.muted(` · updates.isAutoUpdateEnabled (${update.policy.source})`)}`,
        `${style.muted('Allowed   ')} ${update.policy.versionRange ? `updates.versionRange ${update.policy.versionRange}` : `stable minor/patch releases within major ${major}${/-/.test(update.current) ? `; this prerelease advances to its stable release` : ''}`}`,
        `${style.muted('Running   ')} ptbk ${update.current} ${style.muted(`(${update.installation.scope} installation)`)}`,
        `${style.muted('Latest    ')} ${update.latest ?? style.muted(update.lookupProblem ? `unknown (${update.lookupProblem})` : 'not looked up yet')}${update.checkedAt ? style.muted(` · checked ${time(update.checkedAt)}`) : ''}${update.nextLookupAt ? style.muted(` · next ${time(update.nextLookupAt)}`) : ''}`,
        `${style.muted('Status    ')} ${update.phase === 'failed' || update.phase === 'recovering' ? style.warning(update.reason) : update.phase === 'unsupported' ? style.muted(update.reason) : update.reason}`,
    ];
    if (update.lastOutcome) lines.push(`${style.muted('Last      ')} ${update.lastOutcome.outcome === 'verified' ? style.success('verified') : style.warning('failed')} ${update.lastOutcome.from} → ${update.lastOutcome.to}${style.muted(` · ${time(update.lastOutcome.at)} · ${update.lastOutcome.detail}`)}`);
    if (update.target) lines.push(style.muted('  A pending update is a low-priority system task in Tasks; ordinary work goes first and a manual pause or stop holds it.'));
    return lines;
}

/**
 * One row of the External activity log: an action with its observed outcome, or a summary whose counts never claim that
 * all its members succeeded and whose time is visibly the group's latest.
 */
function actionRowLine(row: ActionRow, focused: boolean, pointer: (focused: boolean) => string, style: TerminalProfile['style']): string {
    const { totals, action } = row;
    const when = totals.latestAt ? formatShortTime(Date.parse(totals.latestAt)) : '—';
    const label = terminalSafe(row.label);
    if (action) {
        const who = action.system ? `engine · ${action.system}` : `${action.agent ?? 'unknown agent'} · ${action.taskName ?? action.task}`;
        return [
            `${pointer(focused)} ${style.muted(when)} ${style.muted(`impact ${totals.display}`)} ${label} ${outcomeText(action.outcome, style)}`,
            action.attempts && action.attempts > 1 ? style.muted(` · ${action.attempts} attempts`) : '',
            action.pending ? style.warning(' · not committed') : '',
            style.muted(` · ${terminalSafe(who)}`),
        ].join('');
    }
    const outcomes = Object.entries(totals.outcomes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([outcome, count]) => `${count} ${outcomeText(outcome, style)}`)
        .join(style.muted(', '));
    const count = totals.filtered ? `${totals.count} of ${totals.unfiltered} actions` : `${totals.count} action${totals.count === 1 ? '' : 's'}`;
    return `${pointer(focused)} ${style.muted(`latest ${when}`)} ${style.muted(`impact ${totals.display}`)} ${style.bold(label)} ${style.muted(count)} ${outcomes}${row.note ? style.muted(` · ${row.note}`) : ''}`;
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
        case 'harnesses':
            return ((page.ended ? context.snapshot.harnessSessions?.ended : context.snapshot.harnessSessions?.open) ?? []).map((session) => session.handle);
        case 'tasks':
            return taskOrder(context, page).map((item) => item.ref);
        case 'usage':
            return (usagePageData(context.snapshot, page)?.rows ?? []).map((row) => row.label);
        case 'wallet':
            return context.snapshot.wallet ? walletItems(context.snapshot.wallet).map((item) => `${item.kind}:${item.id}`) : [];
        case 'actions':
            return (page.view?.rows ?? []).map((row) => row.key);
        case 'history':
            return (page.view?.rows ?? []).flatMap((row) => (row.commit ? [row.commit.sha] : []));
        case 'files':
            return (page.view?.entries ?? []).map((entry) => entry.path);
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
 * Outstanding instruction receipts of one session, in the words of its common detail.
 *
 * @private terminal dashboard pages
 */
export function sessionReceiptLines(snapshot: ServiceSnapshot, session: HarnessSessionRecord): string[] {
    const source = session.work.kind === 'task' ? session.work.source : undefined;
    return (snapshot.taskControl?.receipts ?? []).filter((receipt) => receipt.session === session.handle || (source && !receipt.session && receipt.source === source)).map(receiptLine);
}

/**
 * Every active unit of a snapshot (an older engine reports only its single current task).
 *
 * @private terminal dashboard pages
 */
export function activeWork(snapshot: ServiceSnapshot): readonly CurrentWorkView[] {
    return snapshot.active ?? (snapshot.current ? [snapshot.current] : []);
}
