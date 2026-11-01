import type { ActionSummary } from './action-log.js';

/**
 * Default visibility of the External activity log: aggregate impact at or above this value. It applies after
 * aggregation, so ten impact-0 actions form a visible impact-1 group.
 *
 * @private external action impact
 */
export const DEFAULT_IMPACT_CUTOFF = 1;

/**
 * Elapsed time that lowers smart priority by one impact point (a duration, not a calendar month).
 *
 * @private external action impact
 */
export const IMPACT_AGING_MS = 30 * 24 * 3_600_000;

/**
 * Comparison tolerance of floating-point scores: results of the same formula differ only below this.
 */
const SCORE_EPSILON = 1e-9;

/**
 * Most rows returned at once when a request asks for no limit.
 */
const DEFAULT_ROW_LIMIT = 200;

/**
 * Most rows returned at once.
 */
const MAX_ROW_LIMIT = 5_000;

/**
 * Aggregates distinct logical actions: `log10(sum(10^I))`, computed as `m + log10(sum(10^(I-m)))` with `m` the largest
 * score, so very large or very old values neither overflow nor underflow. An empty set has no impact, which is
 * different from impact 0. Rounding is left to whoever displays the result.
 *
 * @private external action impact
 */
export function aggregateImpact(scores: readonly number[]): number | undefined {
    if (!scores.length) return undefined;
    // A loop rather than Math.max(...scores): a large batch would exceed the argument limit.
    let largest = Number.NEGATIVE_INFINITY;
    for (const score of scores) if (score > largest) largest = score;
    let sum = 0;
    for (const score of scores) sum += 10 ** (score - largest);
    return largest + Math.log10(sum);
}

/**
 * Current smart priority of one action: its unchanged impact minus one point per 30 elapsed days. An action dated in
 * the future (clock skew) gets no bonus.
 *
 * @private external action impact
 */
export function actionPriority(impact: number, atMs: number, nowMs: number): number {
    return impact - Math.max(0, nowMs - atMs) / IMPACT_AGING_MS;
}

/**
 * The derived figures of any set of actions. Unknown stays separate from zero: `impact` is the subtotal of known
 * members only, and `incomplete` says so. Each action is counted once, however it is reached.
 *
 * @private external action impact
 */
export type ActionTotals = {
    /** Actions in the set. */
    readonly count: number;
    /** Members with a numeric impact. */
    readonly known: number;
    /** Members with an explicitly unknown impact. */
    readonly unknown: number;
    /** Unrounded aggregate of the known members; absent without any. */
    readonly impact?: number;
    /** Some member's impact is unknown, so `impact` is a known subtotal only. */
    readonly incomplete: boolean;
    /** Unrounded current priority: each member is aged before summing. */
    readonly priority?: number;
    /** Latest member time (a group's time). */
    readonly latestAt?: string;
    /** Members by observed outcome (a group never claims that all succeeded). */
    readonly outcomes: Readonly<Record<string, number>>;
    /** Members of the same set before the outcome filter. */
    readonly unfiltered: number;
    /** A filter selected only some members, so these figures describe that subset. */
    readonly filtered: boolean;
    /** The impact in words for every client; rounding happens only here. */
    readonly display: string;
};

/**
 * Totals of a selected subset of a set (of `unfiltered` members).
 *
 * @private external action impact
 */
export function actionTotals(actions: readonly ActionSummary[], nowMs: number, unfiltered = actions.length): ActionTotals {
    const impacts: number[] = [];
    const priorities: number[] = [];
    const outcomes: Record<string, number> = {};
    let latest = Number.NEGATIVE_INFINITY;
    let latestAt: string | undefined;
    for (const action of actions) {
        outcomes[action.outcome] = (outcomes[action.outcome] ?? 0) + 1;
        const at = action.at ? Date.parse(action.at) : Number.NaN;
        if (action.impact !== undefined) {
            impacts.push(action.impact);
            // Without a usable time its age, and so its priority, is unknown rather than fresh.
            if (Number.isFinite(at)) priorities.push(actionPriority(action.impact, at, nowMs));
        }
        if (Number.isFinite(at) && at > latest) {
            latest = at;
            latestAt = action.at;
        }
    }
    const impact = aggregateImpact(impacts);
    const priority = aggregateImpact(priorities);
    const unknown = actions.length - impacts.length;
    const filtered = actions.length < unfiltered;
    const incomplete = unknown > 0;
    return { count: actions.length, known: impacts.length, unknown, ...(impact === undefined ? {} : { impact }), incomplete, ...(priority === undefined ? {} : { priority }), ...(latestAt ? { latestAt } : {}), outcomes, unfiltered, filtered, display: formatImpact({ ...(impact === undefined ? {} : { impact }), unknown, incomplete, filtered }) };
}

/**
 * The four presentations of the same records.
 *
 * @private external action impact
 */
export const ACTION_GROUPINGS = ['default', 'ungrouped', 'task', 'agent'] as const;

/**
 * A viewer's choice of presentation; it never changes stored membership.
 *
 * @private external action impact
 */
export type ActionGrouping = (typeof ACTION_GROUPINGS)[number];

/**
 * Orders offered by the log; smart comes first because it is the default.
 *
 * @private external action impact
 */
export const ACTION_SORTS = ['smart', 'time', 'impact'] as const;

/**
 * One of the offered orders.
 *
 * @private external action impact
 */
export type ActionSort = (typeof ACTION_SORTS)[number];

/**
 * One request of the log: presentation, independent filter/cutoff/order choices and the drilled-down position.
 *
 * @private external action impact
 */
export type ActionViewQuery = {
    readonly grouping?: ActionGrouping;
    readonly sort?: ActionSort;
    /** Removes the impact cutoff; independent of grouping. */
    readonly showAll?: boolean;
    /** Keeps only actions with this observed outcome (about individual actions, never task results). */
    readonly outcome?: string;
    /** Drill-down: one executing agent. */
    readonly agent?: string;
    /** Drill-down: one task (its source basename) or engine operation. */
    readonly task?: string;
    /** Drill-down: one inherent batch. */
    readonly batch?: string;
    readonly offset?: number;
    readonly limit?: number;
};

/**
 * One displayed row: an individual action or a derived summary of several.
 *
 * @private external action impact
 */
export type ActionRow = {
    /** Stable identity (selection follows it across arrivals). */
    readonly key: string;
    readonly kind: 'action' | 'batch' | 'task' | 'agent';
    /** Readable name of the row. */
    readonly label: string;
    readonly totals: ActionTotals;
    /** The record of an `action` row. */
    readonly action?: ActionSummary;
    /** Drill-down values of a `batch`, `task` or `agent` row. */
    readonly batch?: string;
    readonly task?: string;
    readonly agent?: string;
    /** Further counts of a summary row, e.g. how many tasks a batch spans. */
    readonly note?: string;
};

/**
 * What one level of the log shows. Rebuilding it needs only saved records: no provider, model or remote call.
 *
 * @private external action impact
 */
export type ActionView = {
    readonly grouping: ActionGrouping;
    readonly sort: ActionSort;
    readonly showAll: boolean;
    readonly outcome?: string;
    /** The drilled-down position, outermost first. */
    readonly path: readonly { readonly kind: 'agent' | 'task' | 'batch'; readonly value: string; readonly label: string }[];
    readonly level: 'agents' | 'tasks' | 'mixed' | 'actions';
    readonly rows: readonly ActionRow[];
    /** Rows at this level before the row limit. */
    readonly totalRows: number;
    /** Rows hidden by the cutoff (none below the top level: opening a group shows all its members). */
    readonly hidden: number;
    /** The cutoff applied at this level, when any. */
    readonly cutoff?: number;
    /** Totals of everything at this position, each action counted once. */
    readonly totals: ActionTotals;
    /** When the priorities were calculated. */
    readonly generatedAt: string;
    /** Changes whenever saved records change. */
    readonly revision?: number;
};

/**
 * Comparable name of an executing agent (`@Developer` and `Developer` are one agent).
 */
function agentKey(action: ActionSummary): string {
    if (action.system) return 'engine';
    const name = (action.agent ?? '').replace(/^@/, '').replace(/^\{|\}$/g, '').trim();
    return name ? name.toLowerCase() : 'unknown';
}

/**
 * Readable name of an executing agent, honest about operations without one.
 */
function agentLabel(action: ActionSummary): string {
    if (action.system) return 'Engine operations (no agent)';
    return (action.agent ?? '').replace(/^@/, '').replace(/^\{|\}$/g, '').trim() || 'Unknown agent';
}

/**
 * Readable name of a task, honest about operations without one (no source task is invented).
 */
function taskLabel(action: ActionSummary): string {
    return action.system ? `No task · ${action.system}` : (action.taskName ?? action.task);
}

/**
 * Readable name of one action.
 */
function actionLabel(action: ActionSummary): string {
    return `${action.operation}${action.service ? ` · ${action.service}` : ''}${action.target ? ` → ${action.target}` : ''}`;
}

/**
 * Larger known score first, then unknown in its own explicitly labelled position; equal scores tie.
 */
function compareScores(a: number | undefined, b: number | undefined): number {
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;
    return Math.abs(a - b) < SCORE_EPSILON ? 0 : b - a;
}

/**
 * Newest first; an unknown time last.
 */
function compareTime(a: string | undefined, b: string | undefined): number {
    const [left, right] = [a ? Date.parse(a) : Number.NaN, b ? Date.parse(b) : Number.NaN];
    if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
    if (!Number.isFinite(left)) return 1;
    if (!Number.isFinite(right)) return -1;
    return right - left;
}

/**
 * Orders rows by the chosen criterion with a stable tie-break. The outcome plays no part: failed and successful
 * variants of the same action at the same age tie.
 */
function compareRows(sort: ActionSort): (a: ActionRow, b: ActionRow) => number {
    return (a, b) => {
        const primary = sort === 'time' ? 0 : sort === 'impact' ? compareScores(a.totals.impact, b.totals.impact) : compareScores(a.totals.priority, b.totals.priority);
        return primary || compareTime(a.totals.latestAt, b.totals.latestAt) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    };
}

/**
 * Whether a row passes the cutoff. Unknown is not zero, so a row with unknown members stays visible.
 */
function passesCutoff(row: ActionRow, cutoff: number): boolean {
    return row.totals.unknown > 0 || (row.totals.impact !== undefined && row.totals.impact >= cutoff - SCORE_EPSILON);
}

/**
 * Groups the selected actions of a scope, keeping each group's complete member count for truthful filtered totals.
 */
function grouped(scope: readonly ActionSummary[], selected: ReadonlySet<ActionSummary>, keyOf: (action: ActionSummary) => string): Map<string, { readonly members: ActionSummary[]; total: number }> {
    const groups = new Map<string, { members: ActionSummary[]; total: number }>();
    for (const action of scope) {
        const key = keyOf(action);
        const group = groups.get(key) ?? { members: [], total: 0 };
        group.total++;
        if (selected.has(action)) group.members.push(action);
        groups.set(key, group);
    }
    for (const [key, group] of groups) if (!group.members.length) groups.delete(key);
    return groups;
}

/**
 * Builds one level of the External activity log from saved records. Everything here is derived: durable membership and
 * scores are never changed, each action is counted once at every level, the cutoff is applied to the displayed row
 * after aggregation and only at the top level, because opening a visible group shows every member.
 *
 * @private external action impact
 */
export function buildActionView(actions: readonly ActionSummary[], query: ActionViewQuery = {}, nowMs: number = Date.now(), revision?: number): ActionView {
    const grouping = query.grouping ?? 'default';
    const sort = query.sort ?? 'smart';
    const showAll = query.showAll === true;
    const scope = actions.filter((action) => (query.agent === undefined || agentKey(action) === query.agent) && (query.task === undefined || action.task === query.task) && (query.batch === undefined || action.group === query.batch));
    const selected = new Set(query.outcome ? scope.filter((action) => action.outcome === query.outcome) : scope);
    const level: ActionView['level'] = query.batch !== undefined || grouping === 'ungrouped' ? 'actions' : grouping === 'agent' && query.agent === undefined ? 'agents' : (grouping === 'agent' && query.task === undefined) || (grouping === 'task' && query.task === undefined) ? 'tasks' : 'mixed';
    const actionRow = (action: ActionSummary): ActionRow => ({ key: `action:${action.path}`, kind: 'action', label: actionLabel(action), totals: actionTotals([action], nowMs), action });
    const rows: ActionRow[] = [];
    if (level === 'actions') {
        for (const action of scope) if (selected.has(action)) rows.push(actionRow(action));
    } else if (level === 'agents') {
        for (const [key, group] of grouped(scope, selected, agentKey)) rows.push({ key: `agent:${key}`, kind: 'agent', label: agentLabel(group.members[0]!), agent: key, totals: actionTotals(group.members, nowMs, group.total), note: countOf(group.members, (action) => action.task, 'task') });
    } else if (level === 'tasks') {
        for (const [key, group] of grouped(scope, selected, (action) => action.task)) rows.push({ key: `task:${key}`, kind: 'task', label: taskLabel(group.members[0]!), task: key, totals: actionTotals(group.members, nowMs, group.total), note: query.agent === undefined ? countOf(group.members, agentKey, 'agent') : undefined });
    } else {
        for (const action of scope) if (action.group === undefined && selected.has(action)) rows.push(actionRow(action));
        for (const [key, group] of grouped(scope.filter((action) => action.group !== undefined), selected, (action) => action.group!)) {
            rows.push({ key: `batch:${key}`, kind: 'batch', label: `Batch ${key}`, batch: key, totals: actionTotals(group.members, nowMs, group.total), note: [countOf(group.members, agentKey, 'agent'), countOf(group.members, (action) => action.task, 'task')].filter(Boolean).join(', ') || undefined });
        }
    }
    const top = query.agent === undefined && query.task === undefined && query.batch === undefined;
    const cutoff = top && !showAll ? DEFAULT_IMPACT_CUTOFF : undefined;
    const visible = cutoff === undefined ? rows : rows.filter((row) => passesCutoff(row, cutoff));
    visible.sort(compareRows(sort));
    const offset = Math.max(0, Math.trunc(query.offset ?? 0));
    const limit = Math.min(MAX_ROW_LIMIT, Math.max(1, Math.trunc(query.limit ?? DEFAULT_ROW_LIMIT)));
    const first = scope[0];
    const path: ActionView['path'] = [
        ...(query.agent !== undefined ? [{ kind: 'agent' as const, value: query.agent, label: first ? agentLabel(first) : query.agent }] : []),
        ...(query.task !== undefined ? [{ kind: 'task' as const, value: query.task, label: first ? taskLabel(first) : query.task }] : []),
        ...(query.batch !== undefined ? [{ kind: 'batch' as const, value: query.batch, label: `Batch ${query.batch}` }] : []),
    ];
    return {
        grouping,
        sort,
        showAll,
        ...(query.outcome ? { outcome: query.outcome } : {}),
        path,
        level,
        rows: visible.slice(offset, offset + limit),
        totalRows: visible.length,
        hidden: rows.length - visible.length,
        ...(cutoff === undefined ? {} : { cutoff }),
        totals: actionTotals([...selected], nowMs, scope.length),
        generatedAt: new Date(nowMs).toISOString(),
        ...(revision === undefined ? {} : { revision }),
    };
}

/**
 * `3 tasks`, when a summary spans more than one (one is not worth saying).
 */
function countOf(members: readonly ActionSummary[], keyOf: (action: ActionSummary) => string, noun: string): string | undefined {
    const count = new Set(members.map(keyOf)).size;
    return count > 1 ? `${count} ${noun}s` : undefined;
}

/**
 * The impact of a set for display: rounding happens only here. A filtered subset and a known subtotal say what they are;
 * an all-unknown set has no invented number.
 *
 * @private external action impact
 */
export function formatImpact(totals: Pick<ActionTotals, 'impact' | 'unknown' | 'incomplete' | 'filtered'>): string {
    const known = totals.impact === undefined ? undefined : totals.impact.toFixed(2).replace(/\.?0+$/, '') || '0';
    const value = known === undefined ? 'unknown' : totals.incomplete ? `${known}+ (${totals.unknown} unknown)` : known;
    return totals.filtered ? `${value} filtered` : value;
}

/**
 * Parses and validates view choices from untrusted strings; anything unrecognized falls back to its default.
 *
 * @private external action impact
 */
export function parseActionViewQuery(read: (name: string) => unknown): ActionViewQuery {
    const text = (name: string): string | undefined => {
        const value = read(name);
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    };
    const count = (name: string): number | undefined => {
        const value = Number(read(name));
        return read(name) !== undefined && read(name) !== null && Number.isFinite(value) ? value : undefined;
    };
    const grouping = ACTION_GROUPINGS.find((value) => value === text('grouping'));
    const sort = ACTION_SORTS.find((value) => value === text('sort'));
    const showAll = read('showAll');
    const [outcome, agent, task, batch, offset, limit] = [text('outcome'), text('agent'), text('task'), text('batch'), count('offset'), count('limit')];
    return { ...(grouping ? { grouping } : {}), ...(sort ? { sort } : {}), ...(showAll === true || showAll === 'true' ? { showAll: true } : {}), ...(outcome ? { outcome } : {}), ...(agent ? { agent } : {}), ...(task ? { task } : {}), ...(batch ? { batch } : {}), ...(offset === undefined ? {} : { offset }), ...(limit === undefined ? {} : { limit }) };
}
