import { appendFile, readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { normalizeAgentName, parseReferenceValue } from '../book/references.js';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import type { AuthenticationKind, UsageObservation } from '../harness/types.js';
import type { Project } from '../project/workspace.js';
import { traceBasenameOf } from '../tasks/identity.js';
import { priceOf, type PriceObservation } from './pricing.js';
import type { WorkKind } from './state.js';

/**
 * File name of structured raw usage inside a work's evidence directory.
 *
 * @private raw usage
 */
export const USAGE_FILE = 'usage.jsonl';

/**
 * Versioned schema of one raw usage record.
 *
 * @private raw usage
 */
export const USAGE_SCHEMA = 'ptbk-usage/1';

/**
 * Kind of work that consumed: task work kinds plus conversation work.
 *
 * @private raw usage
 */
export type UsageWorkKind = WorkKind | 'chat' | 'chat-routing' | 'consultation' | 'wallet-test';

/**
 * Who executed, owned and initiated the consumption, and which work it belongs to (named references, never an ID
 * system of its own).
 *
 * @private raw usage
 */
export type UsageAttribution = {
    /** The executing agent. */
    readonly agent: string;
    /** Owner of the work (the task's agent, the chat's main agent). */
    readonly owner?: string;
    /** Who initiated it (`User`, an agent, or the engine for system work). */
    readonly initiator?: string;
    /** The work and its occurrence/attempt context. */
    readonly work: {
        readonly kind: UsageWorkKind;
        readonly task?: string;
        readonly chat?: string;
        /** Project-relative source Book. */
        readonly source?: string;
        readonly run?: string;
        readonly occurrence?: string;
        readonly attempt?: number;
    };
    /** The parent work of induced consumption (a consultation inside a task or chat). */
    readonly parent?: { readonly kind: 'task' | 'chat'; readonly name: string; readonly agent?: string };
};

/**
 * Normalized token categories (absent: not reported by the provider, never zero by assumption).
 *
 * @private raw usage
 */
export type UsageCategories = {
    readonly input?: number;
    readonly output?: number;
    readonly cachedInput?: number;
    readonly cacheWrite?: number;
    readonly reasoning?: number;
    readonly total?: number;
};

/**
 * One durable raw usage record: a provider observation (or an explicit unavailable one) with normalized values and
 * provenance. Raw records are primary evidence, never a cache.
 *
 * @private raw usage
 */
export type UsageRecord = {
    readonly schema: typeof USAGE_SCHEMA;
    /** Groups the observations of one harness run (cumulative observations of one run supersede each other). */
    readonly correlation: string;
    readonly observedAt: string;
    /** Consumption interval: the run's start until this observation. */
    readonly consumed: { readonly from: string; readonly to: string };
    /** `delta` adds up within a run, `cumulative` supersedes earlier ones, `none` for an unavailable record. */
    readonly semantics: UsageObservation['semantics'] | 'none';
    readonly certainty: 'reported' | 'unavailable';
    readonly harness: string;
    /** Named tool instance (nonsecret account context). */
    readonly tool?: string;
    readonly model?: string;
    readonly billing: 'subscription' | 'api' | 'unknown';
    /** Outcome of the run (failed and interrupted attempts consume too). */
    readonly outcome: string;
    /** Provider-native fields exactly as exposed. */
    readonly provider?: Readonly<Record<string, number>>;
    readonly normalized?: UsageCategories;
    /** Whether cached input/reasoning are already included in input/output (absent: unknown). */
    readonly included?: { readonly cachedInInput?: boolean; readonly reasoningInOutput?: boolean };
    /** Provider-reported cost in USD (never a calculated price). */
    readonly costUsd?: number;
    readonly attribution: UsageAttribution;
};

/**
 * Provider field names per normalized category, with the inclusion semantics of known adapters.
 */
const CATEGORY_FIELDS: ReadonlyArray<{ readonly harnesses?: readonly string[]; readonly fields: Readonly<Record<keyof UsageCategories, readonly string[]>>; readonly included?: UsageRecord['included'] }> = [
    {
        harnesses: ['openai-codex'],
        fields: { input: ['input_tokens'], output: ['output_tokens'], cachedInput: ['cached_input_tokens'], cacheWrite: [], reasoning: ['reasoning_output_tokens'], total: ['total_tokens'] },
        included: { cachedInInput: true, reasoningInOutput: true },
    },
    {
        harnesses: ['claude-code'],
        fields: { input: ['input_tokens'], output: ['output_tokens'], cachedInput: ['cache_read_input_tokens'], cacheWrite: ['cache_creation_input_tokens'], reasoning: [], total: [] },
        included: { cachedInInput: false },
    },
    {
        fields: {
            input: ['input_tokens', 'input', 'prompt_tokens', 'promptTokenCount'],
            output: ['output_tokens', 'output', 'completion_tokens', 'candidatesTokenCount'],
            cachedInput: ['cached_input_tokens', 'cache_read_input_tokens', 'cache.read', 'cachedContentTokenCount'],
            cacheWrite: ['cache_creation_input_tokens', 'cache.write'],
            reasoning: ['reasoning_output_tokens', 'reasoning', 'thoughtsTokenCount'],
            total: ['total_tokens', 'total', 'totalTokenCount'],
        },
    },
];

/**
 * Normalizes provider fields into categories for a harness (unknown fields stay only in `provider`).
 *
 * @private raw usage
 */
export function normalizeUsage(harness: string, usage: Readonly<Record<string, number>>): { readonly normalized: UsageCategories; readonly included?: UsageRecord['included'] } {
    const table = CATEGORY_FIELDS.find((entry) => entry.harnesses?.includes(harness)) ?? CATEGORY_FIELDS[CATEGORY_FIELDS.length - 1]!;
    const normalized: Record<string, number> = {};
    for (const [category, fields] of Object.entries(table.fields)) {
        const field = fields.find((name) => typeof usage[name] === 'number');
        if (field) normalized[category] = usage[field]!;
    }
    return { normalized: normalized as UsageCategories, ...(table.included ? { included: table.included } : {}) };
}

/**
 * Billing mode of a run from its authentication: a native account login is subscription work, an API key metered.
 *
 * @private raw usage
 */
export function billingOf(authentication: AuthenticationKind): UsageRecord['billing'] {
    return authentication === 'account' ? 'subscription' : authentication === 'api' ? 'api' : 'unknown';
}

/**
 * Builds the raw records of one harness run: one per provider observation (the finest data), or one explicit
 * `unavailable` record when the provider exposed nothing (unknown is not zero).
 *
 * @private raw usage
 */
export function usageRecords(input: {
    readonly observations: readonly UsageObservation[];
    readonly startedAt: string;
    readonly harness: string;
    readonly tool?: string;
    readonly model?: string;
    readonly authentication: AuthenticationKind;
    readonly outcome: string;
    readonly attribution: UsageAttribution;
}): UsageRecord[] {
    const correlation = `${input.attribution.work.run ?? input.attribution.work.kind}-${shortId()}`;
    const common = { schema: USAGE_SCHEMA, correlation, harness: input.harness, ...(input.tool ? { tool: input.tool } : {}), ...(input.model ? { model: input.model } : {}), billing: billingOf(input.authentication), outcome: input.outcome, attribution: input.attribution } as const;
    if (!input.observations.length) {
        const now = new Date().toISOString();
        return [{ ...common, observedAt: now, consumed: { from: input.startedAt, to: now }, semantics: 'none', certainty: 'unavailable' }];
    }
    return input.observations.map((observation) => {
        const { normalized, included } = normalizeUsage(input.harness, observation.usage);
        return {
            ...common,
            observedAt: observation.at,
            consumed: { from: input.startedAt, to: observation.at },
            semantics: observation.semantics,
            certainty: 'reported',
            provider: observation.usage,
            normalized,
            ...(included ? { included } : {}),
            ...(observation.costUsd !== undefined ? { costUsd: observation.costUsd } : {}),
        };
    });
}

/**
 * Appends raw records to a usage file (JSON Lines, append-only; the evidence directory is created when needed).
 *
 * @private raw usage
 */
export async function appendUsage(file: string, records: readonly UsageRecord[]): Promise<void> {
    if (!records.length) return;
    await ensureDirectory(dirname(file));
    await appendFile(file, records.map((record) => `${JSON.stringify(record)}\n`).join(''));
}

/**
 * Usage file of a task's evidence directory (`traces/<task-file-basename>/usage.jsonl`).
 *
 * @private raw usage
 */
export function taskUsageFile(traceDirectory: string): string {
    return join(traceDirectory, USAGE_FILE);
}

/**
 * Usage file of a chat's own evidence (`traces/.chats/<chat-file-basename>/usage.jsonl`): chat work keeps its own
 * attribution and never invents a task to store usage.
 *
 * @private raw usage
 */
export function chatUsageFile(project: Pick<Project, 'root'>, chatPath: string): string {
    const name = traceBasenameOf(chatPath) ?? basename(chatPath).replace(/\.[^.]+$/, '');
    return join(project.root, 'traces', '.chats', name, USAGE_FILE);
}

/**
 * Usage file of the short agent sessions of Wallet credential tests: ignored runtime evidence that counts in the project's
 * totals, because a test has no task, chat or trace directory and creates no Git history of its own.
 *
 * @private raw usage
 */
export function walletTestUsageFile(project: Pick<Project, 'root'>): string {
    return join(project.root, '.ptbk', 'usage', USAGE_FILE);
}

/**
 * One underlying consumption: the observations of one run collapsed without double counting (the last cumulative
 * observation, otherwise the sum of deltas).
 *
 * @private raw usage
 */
export type UsageUnit = {
    readonly correlation: string;
    readonly at: string;
    readonly harness: string;
    readonly tool?: string;
    readonly model?: string;
    readonly billing: UsageRecord['billing'];
    readonly certainty: 'reported' | 'unavailable';
    readonly categories: UsageCategories;
    /** Inclusion semantics of the categories (absent: unknown). */
    readonly included?: UsageRecord['included'];
    readonly costUsd?: number;
    readonly attribution: UsageAttribution;
};

/**
 * Collapses raw records into consumption units: within one run a cumulative (or unknown-semantics) observation
 * supersedes the earlier ones, deltas add up, so streamed updates plus a final total never count twice.
 *
 * @private raw usage
 */
export function usageUnits(records: readonly UsageRecord[]): UsageUnit[] {
    const runs = new Map<string, UsageRecord[]>();
    for (const record of records) runs.set(record.correlation, [...(runs.get(record.correlation) ?? []), record]);
    const units: UsageUnit[] = [];
    for (const [correlation, group] of runs) {
        const ordered = [...group].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
        const last = ordered[ordered.length - 1]!;
        const reported = ordered.filter((record) => record.certainty === 'reported');
        const superseding = [...reported].reverse().find((record) => record.semantics !== 'delta');
        const deltas = reported.filter((record) => record.semantics === 'delta');
        let categories: UsageCategories = {};
        let costUsd: number | undefined;
        const included = reported.find((record) => record.included)?.included;
        if (superseding) {
            categories = superseding.normalized ?? {};
            costUsd = superseding.costUsd;
        } else if (deltas.length) {
            const sum: Record<string, number> = {};
            for (const record of deltas) for (const [key, value] of Object.entries(record.normalized ?? {})) sum[key] = (sum[key] ?? 0) + value;
            categories = sum as UsageCategories;
            const costs = deltas.flatMap((record) => (record.costUsd === undefined ? [] : [record.costUsd]));
            costUsd = costs.length ? costs.reduce((total, cost) => total + cost, 0) : undefined;
        }
        units.push({
            correlation,
            at: last.consumed.to,
            harness: last.harness,
            ...(last.tool ? { tool: last.tool } : {}),
            ...(last.model ? { model: last.model } : {}),
            billing: last.billing,
            certainty: reported.length ? 'reported' : 'unavailable',
            categories,
            ...(included ? { included } : {}),
            ...(costUsd !== undefined ? { costUsd } : {}),
            attribution: last.attribution,
        });
    }
    return units;
}

/**
 * Reads every raw usage record of the project (task and chat evidence). Malformed lines are skipped, never fatal.
 *
 * @private raw usage
 */
export async function readUsage(project: Pick<Project, 'root'>): Promise<UsageRecord[]> {
    const records: UsageRecord[] = [];
    const traces = join(project.root, 'traces');
    const directories = [
        ...(await readdir(traces, { withFileTypes: true }).catch(() => [])).filter((entry) => entry.isDirectory() && entry.name !== '.chats').map((entry) => join(traces, entry.name)),
        ...(await readdir(join(traces, '.chats'), { withFileTypes: true }).catch(() => [])).filter((entry) => entry.isDirectory()).map((entry) => join(traces, '.chats', entry.name)),
    ];
    for (const file of [...directories.map((directory) => join(directory, USAGE_FILE)), walletTestUsageFile(project)]) {
        const text = await readFile(file, 'utf8').catch(() => '');
        for (const line of text.split('\n')) {
            if (!line.trim()) continue;
            try {
                const record = JSON.parse(line) as UsageRecord;
                if (record.schema === USAGE_SCHEMA) records.push(record);
            } catch {
                // A torn last line of an interrupted write is not evidence.
            }
        }
    }
    return records;
}

/**
 * Grouping of the usage view.
 *
 * @private raw usage
 */
export type UsageGrouping = 'none' | 'agent' | 'harness' | 'model' | 'work' | 'day' | 'task' | 'chat' | 'tool';

/**
 * Every grouping of the shared usage view (validation of API and control requests).
 *
 * @private raw usage
 */
export const USAGE_GROUPINGS: readonly UsageGrouping[] = ['none', 'agent', 'harness', 'model', 'work', 'day', 'task', 'chat', 'tool'];

/**
 * Dimensions a usage view can be filtered by; every given one must match, so filters combine.
 *
 * @private raw usage
 */
export const USAGE_FILTER_FIELDS = ['agent', 'task', 'chat', 'work', 'tool', 'harness', 'model'] as const;

/**
 * A combination of usage filters (absent fields match everything). With inclusive scope `agent`, `task` and `chat`
 * also match the work they initiated or contain (a consultation inside a task, delegated work of an agent).
 *
 * @private raw usage
 */
export type UsageFilter = { readonly [field in (typeof USAGE_FILTER_FIELDS)[number]]?: string };

/**
 * Totals of a set of consumption units, keeping billing mode and certainty visible.
 *
 * @private raw usage
 */
export type UsageTotals = {
    readonly units: number;
    readonly input: number;
    readonly output: number;
    readonly cachedInput: number;
    readonly reasoning: number;
    /** Provider-reported cost, only over units that reported one. */
    readonly reportedCostUsd: number;
    /**
     * Token prices calculated at the rates valid at consumption time (USD lists only): metered API work and, separately,
     * the labelled token-price equivalent of subscription work (never an API charge or quota share).
     */
    readonly calculated: { readonly apiUsd: number; readonly subscriptionEquivalentUsd: number; readonly priced: number; readonly estimated: number; readonly unpriced: number };
    readonly billing: Readonly<Record<UsageRecord['billing'], number>>;
    /** Units with reported numbers versus units whose usage is unavailable (never counted as zero). */
    readonly coverage: { readonly reported: number; readonly unavailable: number; readonly costReported: number };
};

/**
 * One row of the usage view.
 *
 * @private raw usage
 */
export type UsageRow = UsageTotals & {
    readonly label: string;
    /** The filter selecting exactly this row's work (absent for a row of missing attribution, which is never guessed). */
    readonly filter?: UsageFilter;
};

/**
 * The lightweight usage view (shared by terminal, browser and API).
 *
 * @private raw usage
 */
export type UsageSummary = {
    readonly from: string;
    readonly to: string;
    readonly days: number;
    readonly grouping: UsageGrouping;
    readonly scope: 'self' | 'inclusive';
    /** The combined filter applied before grouping (empty: all work). */
    readonly filter: UsageFilter;
    /** Every underlying consumption counted exactly once. */
    readonly total: UsageTotals;
    readonly rows: readonly UsageRow[];
};

/**
 * Sums units (a unit counts once per call).
 */
function totals(units: readonly UsageUnit[], prices: readonly PriceObservation[]): UsageTotals {
    const billing = { subscription: 0, api: 0, unknown: 0 };
    let [input, output, cachedInput, reasoning, reportedCostUsd, reported, unavailable, costReported] = [0, 0, 0, 0, 0, 0, 0, 0];
    const calculated = { apiUsd: 0, subscriptionEquivalentUsd: 0, priced: 0, estimated: 0, unpriced: 0 };
    for (const unit of units) {
        billing[unit.billing]++;
        if (unit.certainty === 'unavailable') {
            unavailable++;
            continue;
        }
        const price = priceOf(unit, prices, unit.included);
        if (!price || price.currency !== 'USD') calculated.unpriced++;
        else {
            if (unit.billing === 'subscription') calculated.subscriptionEquivalentUsd += price.amount;
            else calculated.apiUsd += price.amount;
            calculated.priced++;
            if (price.certainty === 'estimated') calculated.estimated++;
        }
        reported++;
        input += unit.categories.input ?? 0;
        output += unit.categories.output ?? 0;
        cachedInput += unit.categories.cachedInput ?? 0;
        reasoning += unit.categories.reasoning ?? 0;
        if (unit.costUsd !== undefined) {
            reportedCostUsd += unit.costUsd;
            costReported++;
        }
    }
    return { units: units.length, input, output, cachedInput, reasoning, reportedCostUsd, calculated, billing, coverage: { reported, unavailable, costReported } };
}

/**
 * Normalized key of an agent reference.
 */
function agentKey(name: string | undefined): string | undefined {
    return name ? normalizeAgentName(parseReferenceValue(name)?.name ?? name) : undefined;
}

/**
 * A usage view request as every surface sends it (HTTP query or control parameters).
 *
 * @private raw usage
 */
export type UsageRequest = { readonly days: number; readonly grouping: UsageGrouping; readonly scope: 'self' | 'inclusive'; readonly filter: UsageFilter };

/**
 * Reads and validates a usage view request: `days` (1–3660, default 7), `group`, `scope` and the filter fields.
 *
 * @private raw usage
 */
export function parseUsageRequest(read: (name: string) => unknown): UsageRequest {
    const text = (name: string): string | undefined => {
        const value = read(name);
        return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : undefined;
    };
    const grouping = text('group') ?? 'none';
    const scope = text('scope') ?? 'self';
    const days = Number(text('days') ?? 7);
    if (!(USAGE_GROUPINGS as readonly string[]).includes(grouping) || !['self', 'inclusive'].includes(scope) || !Number.isFinite(days) || days <= 0 || days > 3660) {
        throw new PtbkError(`Use group=${USAGE_GROUPINGS.join('|')}, scope=self|inclusive and days between 1 and 3660.`, { kind: 'usage' });
    }
    const filter = Object.fromEntries(USAGE_FILTER_FIELDS.flatMap((field) => (text(field) ? [[field, text(field)!]] : []))) as UsageFilter;
    return { days, grouping: grouping as UsageGrouping, scope: scope as 'self' | 'inclusive', filter };
}

/**
 * Agents a unit belongs to: the executing agent, plus with inclusive scope its initiator and parent agent.
 */
function unitAgents(unit: UsageUnit, scope: 'self' | 'inclusive'): string[] {
    const own = [unit.attribution.agent];
    if (scope === 'inclusive') own.push(...[unit.attribution.initiator, unit.attribution.parent?.agent].filter((name): name is string => Boolean(name) && name !== 'User' && name !== 'engine'));
    const seen = new Set<string>();
    return own.filter((name) => {
        const key = agentKey(name)!;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Tasks or chats a unit belongs to: its own work, plus with inclusive scope the parent work containing it.
 */
function unitWork(unit: UsageUnit, kind: 'task' | 'chat', scope: 'self' | 'inclusive'): string[] {
    const own = unit.attribution.work[kind];
    const parent = scope === 'inclusive' && unit.attribution.parent?.kind === kind ? unit.attribution.parent.name : undefined;
    return [...new Set([own, parent].filter((name): name is string => Boolean(name)))];
}

/**
 * Whether a unit matches every given field of a filter.
 */
function matchesUsageFilter(unit: UsageUnit, filter: UsageFilter, scope: 'self' | 'inclusive'): boolean {
    if (filter.agent && !unitAgents(unit, scope).some((name) => agentKey(name) === agentKey(filter.agent))) return false;
    if (filter.task && !unitWork(unit, 'task', scope).includes(filter.task)) return false;
    if (filter.chat && !unitWork(unit, 'chat', scope).includes(filter.chat)) return false;
    if (filter.work && unit.attribution.work.kind !== filter.work) return false;
    if (filter.tool && unit.tool !== filter.tool) return false;
    if (filter.harness && unit.harness !== filter.harness) return false;
    if (filter.model && unit.model !== filter.model) return false;
    return true;
}

/**
 * Summarizes raw usage for a time window, grouped by one dimension. With `inclusive` scope an agent's row also
 * contains the work it initiated (consultations, delegated work); such rows overlap by design, while the total
 * counts every underlying consumption once. Opening a view never writes or manufactures usage.
 *
 * @private raw usage
 */
export function summarizeUsage(
    records: readonly UsageRecord[],
    options: { readonly days?: number; readonly grouping?: UsageGrouping; readonly scope?: 'self' | 'inclusive'; readonly filter?: UsageFilter; readonly now?: number; readonly prices?: readonly PriceObservation[] } = {},
): UsageSummary {
    const prices = options.prices ?? [];
    const days = options.days ?? 7;
    const now = options.now ?? Date.now();
    const from = new Date(now - days * 86_400_000).toISOString();
    const to = new Date(now).toISOString();
    const grouping = options.grouping ?? 'none';
    const scope = options.scope ?? 'self';
    const filter = Object.fromEntries(Object.entries(options.filter ?? {}).filter(([, value]) => typeof value === 'string' && value.trim()).map(([field, value]) => [field, value!.trim()])) as UsageFilter;
    const units = usageUnits(records).filter((unit) => unit.at >= from && unit.at <= to && matchesUsageFilter(unit, filter, scope));
    // Each label with the filter that selects it; missing attribution is its own explicit row without a filter.
    const labels = (unit: UsageUnit): { readonly label: string; readonly filter?: UsageFilter }[] => {
        switch (grouping) {
            case 'agent':
                return unitAgents(unit, scope).map((agent) => ({ label: agent, filter: { agent } }));
            case 'harness':
                return [{ label: unit.tool ? `${unit.harness} (${unit.tool})` : unit.harness, filter: { harness: unit.harness, ...(unit.tool ? { tool: unit.tool } : {}) } }];
            case 'model':
                return [unit.model ? { label: unit.model, filter: { model: unit.model } } : { label: 'model not reported' }];
            case 'work':
                return [{ label: unit.attribution.work.kind, filter: { work: unit.attribution.work.kind } }];
            case 'task':
            case 'chat': {
                const names = unitWork(unit, grouping, scope);
                return names.length ? names.map((name) => ({ label: name, filter: { [grouping]: name } })) : [{ label: `not in a ${grouping}` }];
            }
            case 'tool':
                return [unit.tool ? { label: unit.tool, filter: { tool: unit.tool } } : { label: 'tool not recorded' }];
            case 'day':
                return [{ label: unit.at.slice(0, 10) }];
            case 'none':
                return [];
        }
    };
    const groups = new Map<string, { filter?: UsageFilter; members: UsageUnit[] }>();
    for (const unit of units) {
        for (const { label, filter: selecting } of labels(unit)) {
            const group = groups.get(label) ?? { ...(selecting ? { filter: selecting } : {}), members: [] };
            group.members.push(unit);
            groups.set(label, group);
        }
    }
    const rows = [...groups.entries()]
        .map(([label, group]) => ({ label, ...(group.filter ? { filter: group.filter } : {}), ...totals(group.members, prices) }))
        .sort((a, b) => b.input + b.output - (a.input + a.output) || b.units - a.units || a.label.localeCompare(b.label));
    return { from, to, days, grouping, scope, filter, total: totals(units, prices), rows };
}
