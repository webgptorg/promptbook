/**
 * One task of the complete inventory as views show it (every state, including completed and historical work).
 *
 * @private task views
 */
export type TaskInventoryItem = {
    readonly ref: string;
    readonly title: string;
    /** Readiness kind (shared with list, dry-run, dashboards and execution). */
    readonly readiness: string;
    readonly reason: string;
    /** Effective numeric priority. */
    readonly priority: number;
    /** Original priority wording, when given. */
    readonly priorityText?: string;
    /** Responsible agent (requirement or Router's recorded choice). */
    readonly agent?: string;
    /** The task's MODEL as written (empty when unconstrained). */
    readonly model?: string;
    /** Next execution opportunity (ISO): earliest start or next occurrence. */
    readonly until?: string;
    /** Recurrence interval text. */
    readonly repeat?: string;
    /** Most recent completion stamp (ISO). */
    readonly lastDone?: string;
    /** Number of completion stamps. */
    readonly doneCount: number;
    /** Project-relative source. */
    readonly source: string;
    /** Provenance. */
    readonly origin?: string;
    /** The chat holding this task's pending question (the same question and answer as in that chat). */
    readonly waitingChat?: string;
    /** `system`: an engine-defined task without a project Book (e.g. the engine's self-update); ordinary when absent. */
    readonly kind?: 'ordinary' | 'system';
    /** The actual executor of a system task (its engine implementation), shown instead of an agent. */
    readonly executor?: string;
    /** The durable definition this item's run belongs to when the title names one run (a system task's engine definition). */
    readonly definition?: string;
    /** Which retry the pending run is after consecutive failed runs of the definition (absent for a first attempt). */
    readonly retry?: number;
    /** Recent finished runs of the definition, newest first (a system task keeps them without a project trace directory). */
    readonly runs?: readonly TaskRunView[];
};

/**
 * One finished run of a task definition as views show it.
 *
 * @private task views
 */
export type TaskRunView = {
    /** When the run finished (ISO). */
    readonly at: string;
    /** What the run did, e.g. `0.119.0 → 0.120.0`. */
    readonly title: string;
    readonly outcome: 'completed' | 'failed';
    /** The verified result or the cause of the failure. */
    readonly detail: string;
};

/**
 * Fields a viewer may sort the complete task inventory by (`smart` is the default current-work view).
 *
 * @private task views
 */
export const TASK_SORT_FIELDS = ['smart', 'priority', 'time', 'status', 'agent', 'name'] as const;

/**
 * One sort field.
 *
 * @private task views
 */
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

/**
 * Readiness kinds of running work, work ready now and actionable blockers/waits (the decisions of today).
 */
const CURRENT_KINDS = new Set(['active', 'ready', 'awaiting-user', 'needs-assignment', 'assigning', 'blocked', 'needs-recovery', 'incompatible', 'failed']);

/**
 * Within this horizon future work is "coming up soon" and completed work is "recent".
 */
const NEAR_MS = 7 * 24 * 3_600_000;

/**
 * Prominence group of the smart view: 0 current decisions, 1 coming up soon, 2 recently completed, 3 distant future,
 * 4 old history (deeply historical tasks last).
 */
function smartGroup(item: TaskInventoryItem, now: number): number {
    const until = item.until ? Date.parse(item.until) : undefined;
    if (item.readiness === 'needs-assignment' && until !== undefined) return until - now <= NEAR_MS ? 1 : 3;
    if (CURRENT_KINDS.has(item.readiness)) return 0;
    if (item.readiness === 'waiting-until') return until !== undefined && until - now > NEAR_MS ? 3 : 1;
    if (item.readiness === 'waiting-dependency' || item.readiness === 'not-ready' || item.readiness === 'placeholder') return 1;
    if (item.readiness === 'done' || item.readiness === 'retired') return item.lastDone && now - Date.parse(item.lastDone) <= NEAR_MS ? 2 : 4;
    return 1;
}

/**
 * Rank of readiness kinds inside the current-decisions group (running first, then what needs the user).
 */
const CURRENT_RANK: Readonly<Record<string, number>> = { active: 0, 'awaiting-user': 1, ready: 2, 'needs-assignment': 3, assigning: 4, 'needs-recovery': 5, failed: 6, incompatible: 7, blocked: 8 };

/**
 * Time of an item relevant to its group (nearer opportunities first, recent completions first).
 */
function relevantTime(item: TaskInventoryItem, group: number): number {
    if (group === 2 || group === 4) return -(item.lastDone ? Date.parse(item.lastDone) : 0);
    return item.until ? Date.parse(item.until) : Number.MAX_SAFE_INTEGER;
}

/**
 * The smart default order: current decisions, work coming up soon, recent results, distant future, then old history.
 * Within comparable groups recurring work is more prominent, then effective priority, then time; ties keep a stable
 * order by name. A presentation only: it never changes scheduling, priorities or sources (no model call).
 *
 * @private task views
 */
export function smartTaskOrder(items: readonly TaskInventoryItem[], now: number = Date.now()): TaskInventoryItem[] {
    return [...items]
        .map((item) => ({ item, group: smartGroup(item, now) }))
        .sort(
            (a, b) =>
                a.group - b.group ||
                (a.group === 0 ? (CURRENT_RANK[a.item.readiness] ?? 9) - (CURRENT_RANK[b.item.readiness] ?? 9) : 0) ||
                Number(Boolean(b.item.repeat)) - Number(Boolean(a.item.repeat)) ||
                (a.group <= 1 ? b.item.priority - a.item.priority : 0) ||
                relevantTime(a.item, a.group) - relevantTime(b.item, b.group) ||
                a.item.title.localeCompare(b.item.title),
        )
        .map(({ item }) => item);
}

/**
 * Sorts the complete inventory by a viewer-selected field and direction (stable; `smart` ignores the direction of
 * its built-in groups only by reversing the whole list when descending is requested).
 *
 * @private task views
 */
export function sortTasks(items: readonly TaskInventoryItem[], field: TaskSortField, descending = false, now: number = Date.now()): TaskInventoryItem[] {
    let sorted: TaskInventoryItem[];
    const byName = (a: TaskInventoryItem, b: TaskInventoryItem): number => a.title.localeCompare(b.title);
    switch (field) {
        case 'smart':
            sorted = smartTaskOrder(items, now);
            break;
        case 'priority':
            sorted = [...items].sort((a, b) => a.priority - b.priority || byName(a, b));
            break;
        case 'time': {
            const time = (item: TaskInventoryItem): number => (item.until ? Date.parse(item.until) : item.lastDone ? Date.parse(item.lastDone) : 0);
            sorted = [...items].sort((a, b) => time(a) - time(b) || byName(a, b));
            break;
        }
        case 'status':
            sorted = [...items].sort((a, b) => a.readiness.localeCompare(b.readiness) || byName(a, b));
            break;
        case 'agent':
            sorted = [...items].sort((a, b) => (a.agent ?? '~').localeCompare(b.agent ?? '~') || byName(a, b));
            break;
        case 'name':
            sorted = [...items].sort(byName);
            break;
    }
    return descending ? sorted.reverse() : sorted;
}

/**
 * A viewer-selected filter of the task inventory: every given field must match (absent fields match everything).
 *
 * @private task views
 */
export type TaskFilter = {
    /** Case-insensitive text found in the title, source, agent, reason or origin. */
    readonly text?: string;
    /** Exact readiness kind, e.g. `ready`, `waiting-until` or `done`. */
    readonly readiness?: string;
    /** Responsible agent by name (`@Name`, `{Name}` and `Name` are the same agent). */
    readonly agent?: string;
    /** Ordinary project tasks or engine-defined system tasks. */
    readonly kind?: 'ordinary' | 'system';
};

/**
 * Normalized agent name of a written reference.
 */
function agentKey(agent: string): string {
    return agent.trim().replace(/^@|^\{|\}$/g, '').toLowerCase();
}

/**
 * Filters the complete inventory by a viewer's choices. A presentation only, like sorting: it never changes
 * scheduling, and clearing the filter makes every task (distant and completed ones included) reachable again.
 *
 * @private task views
 */
export function filterTasks(items: readonly TaskInventoryItem[], filter: TaskFilter): TaskInventoryItem[] {
    const text = filter.text?.trim().toLowerCase();
    const agent = filter.agent?.trim() ? agentKey(filter.agent) : undefined;
    return items.filter(
        (item) =>
            (!filter.readiness || item.readiness === filter.readiness) &&
            (!agent || (item.agent !== undefined && agentKey(item.agent) === agent)) &&
            (!filter.kind || (item.kind ?? 'ordinary') === filter.kind) &&
            (!text || [item.title, item.source, item.agent, item.reason, item.origin].some((field) => field?.toLowerCase().includes(text))),
    );
}

/**
 * Whether a filter selects anything at all (an empty filter shows the complete inventory).
 *
 * @private task views
 */
export function isTaskFilterActive(filter: TaskFilter): boolean {
    return Boolean(filter.text?.trim() || filter.readiness || filter.agent?.trim() || filter.kind);
}

/**
 * Human description of an active filter (empty when nothing is filtered).
 *
 * @private task views
 */
export function describeTaskFilter(filter: TaskFilter): string {
    return [filter.readiness ? `status ${filter.readiness}` : '', filter.agent?.trim() ? `agent ${filter.agent.trim()}` : '', filter.kind ? `${filter.kind} tasks` : '', filter.text?.trim() ? `"${filter.text.trim()}"` : ''].filter(Boolean).join(', ');
}

/**
 * The filter values present in the complete inventory (so a viewer only ever picks a value that selects something).
 *
 * @private task views
 */
export type TaskFilterChoices = {
    readonly readiness: readonly string[];
    readonly agents: readonly string[];
    readonly kinds: readonly ('ordinary' | 'system')[];
};

/**
 * Collects the readiness kinds, responsible agents and task kinds present in the complete (unfiltered) inventory.
 *
 * @private task views
 */
export function taskFilterChoices(items: readonly TaskInventoryItem[]): TaskFilterChoices {
    const agents = new Map<string, string>();
    for (const item of items) if (item.agent && !agents.has(agentKey(item.agent))) agents.set(agentKey(item.agent), item.agent);
    const kinds = new Set(items.map((item) => item.kind ?? 'ordinary'));
    return {
        readiness: [...new Set(items.map((item) => item.readiness))].sort(),
        agents: [...agents.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, agent]) => agent),
        kinds: (['ordinary', 'system'] as const).filter((kind) => kinds.has(kind)),
    };
}
