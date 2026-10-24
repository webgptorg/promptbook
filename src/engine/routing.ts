import { describeModel, determinedRow, formatModelRow, intersectModels, intersectRows, isImpossible, parseModelRow, rowAllows, UNCONSTRAINED, type ModelConstraint, type ModelRow } from '../book/model.js';
import { normalizeAgentName, toReference } from '../book/references.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import { resolveEffectiveAgent, type AgentCatalog, type EffectiveAgent } from '../project/agents.js';
import { harnessName, harnessPlugin } from '../harness/registry.js';
import { modelMetadata } from '../harness/models.js';
import { harnessPluginId, harnessVariantOf, toolRuntime, type HarnessVariant } from '../tools/model.js';
import type { HarnessInspection, HarnessPlugin } from '../harness/types.js';
import type { Task } from '../tasks/model.js';
import type { HarnessPool } from './harnesses.js';
import type { RoutingSelection } from './state.js';

/**
 * Outcome of routing one task.
 *
 * - `routable`: a concrete compatible execution with a usable tool now
 * - `needs-assignment`: Router must choose (missing agent, MODEL not concrete, textual priority)
 * - `blocked`: a real wait (resources temporarily unusable) or an invalid source
 * - `incompatible`: no compatible combination exists: the task stays blocked and a separate Fixer repair task is due
 *
 * @private routing
 */
export type RouteResolution =
    | {
          readonly kind: 'routable';
          readonly agent: EffectiveAgent;
          readonly selection: RoutingSelection;
          readonly plugin: HarnessPlugin;
          readonly inspection: HarnessInspection;
      }
    | { readonly kind: 'needs-assignment'; readonly reason: string }
    | { readonly kind: 'blocked'; readonly reason: string; readonly next?: string }
    | { readonly kind: 'incompatible'; readonly reason: string; readonly next?: string };

/**
 * Inputs of routing.
 *
 * @private routing
 */
export type RoutingContext = {
    /** Agent catalog. */
    readonly catalog: AgentCatalog;
    /** Harness availability. */
    readonly pool: HarnessPool;
    /** Effective settings. */
    readonly settings: EffectiveSettings;
};

/**
 * Whether a harness variant has a thinking control (its absence is model-native, not an unresolved wildcard).
 *
 * @private routing
 */
export function hasThinking(variant: HarnessVariant): boolean {
    return Boolean(harnessPlugin(harnessPluginId(variant))?.thinkingLevels.length);
}

/**
 * The concrete combination a plugin's coded defaults give (its default model, or the first model of a complete
 * catalog lacking it, and its default thinking level) at an endpoint: the bootstrap of Router and of repair work.
 *
 * @private routing
 */
export function pluginDefaultRow(plugin: HarnessPlugin, catalog: readonly string[] = [], runtime: string = 'official'): ModelRow {
    const model = plugin.modelCatalog === 'complete' && catalog.length && !catalog.includes(plugin.defaultModel) ? catalog[0]! : plugin.defaultModel;
    const thinking = plugin.thinkingLevels.length ? (plugin.defaultThinkingLevel ?? plugin.thinkingLevels[0]) : undefined;
    return { harness: plugin.variant, model, ...(thinking ? { thinking } : {}), runtime };
}

/**
 * The agent's durable MODEL intersected with the task's requirement.
 *
 * @private routing
 */
export function executionConstraint(agent: EffectiveAgent, requirement: ModelConstraint): ModelConstraint {
    return intersectModels(agent.model, requirement);
}

/**
 * Any-of selector match against agent name, harness and model (opaque legacy TASK RUNNER / Markdown selectors).
 */
function selectorsMatch(selectors: readonly string[], agentName: string, harness: string, model: string | undefined): boolean {
    if (!selectors.length) return true;
    const haystacks = [agentName.toLowerCase(), normalizeAgentName(agentName), harness.toLowerCase(), harnessName(harness).toLowerCase(), (model ?? '').toLowerCase()].filter(Boolean);
    return selectors.some((selector) => haystacks.some((haystack) => haystack.includes(selector.toLowerCase())));
}

/**
 * A harness requirement (variant such as `openai-codex`, or a configured tool instance name) as a variant plus an
 * optional explicit instance restriction (CLI `--harness`).
 *
 * @private routing
 */
export function harnessRequirement(value: string, pool: HarnessPool): { variant: string; tool?: string } | undefined {
    if (harnessPlugin(value)) return { variant: value };
    const instance = pool.instance(value);
    if (instance) return { variant: harnessPluginId(instance.variant), tool: instance.name };
    const variant = harnessVariantOf(value.toLowerCase().replace(/_/g, '-'));
    return variant ? { variant: harnessPluginId(variant) } : undefined;
}

/**
 * Explicit invocation choices (`--harness`, `--model`, `--thinking-level`) as a MODEL requirement of that operation,
 * plus a named-instance restriction when `--harness` names a tool. They intersect agent/task constraints and can
 * never relax them.
 *
 * @private routing
 */
export function invocationRequirement(options: { readonly harness?: string; readonly model?: string; readonly thinkingLevel?: string }, pool: HarnessPool): { readonly constraint: ModelConstraint; readonly tool?: string; readonly problem?: string } {
    if (!options.harness && !options.model && !options.thinkingLevel) return { constraint: UNCONSTRAINED };
    const required = options.harness ? harnessRequirement(options.harness, pool) : undefined;
    if (options.harness && !required) return { constraint: UNCONSTRAINED, problem: `--harness ${options.harness} is neither a supported harness variant nor a configured harness tool.` };
    const parts = [required ? `harness=${harnessPlugin(required.variant)!.variant}` : '', options.model ? `model=${options.model}` : '', options.thinkingLevel ? `thinking=${options.thinkingLevel}` : ''].filter(Boolean);
    const parsed = parseModelRow(parts.join(' '));
    if (!parsed.row) return { constraint: UNCONSTRAINED, problem: parsed.problems.join('; ') };
    return { constraint: { rows: [parsed.row], explicit: true }, tool: required?.tool };
}

/**
 * Human label of an endpoint requirement.
 */
function endpointLabel(runtime: string | undefined): string {
    if (!runtime || runtime === 'default') return '';
    return runtime === 'official' ? ' aimed at the official endpoint' : runtime === 'local' ? ' for local inference on the engine host' : ` aimed at ${runtime}`;
}

/**
 * Checks a concrete combination against the actual tools and capabilities and selects the serving instance: the
 * first usable enabled instance of the variant aimed at the required endpoint (same-variant fallback stays within it).
 *
 * @private routing
 */
export async function routeConcrete(agent: EffectiveAgent, row: ModelRow, context: RoutingContext, options: { readonly sources?: RoutingSelection['sources']; readonly tool?: string } = {}): Promise<RouteResolution> {
    const plugin = row.harness ? harnessPlugin(harnessPluginId(row.harness)) : undefined;
    if (!plugin || !row.model) return { kind: 'needs-assignment', reason: `MODEL ${formatModelRow(row)} is not concrete yet; Router completes it.` };
    if (row.thinking && !plugin.thinkingLevels.includes(row.thinking)) {
        return { kind: 'incompatible', reason: `${plugin.displayName} does not support thinking=${row.thinking}${plugin.thinkingLevels.length ? ` (supported: ${plugin.thinkingLevels.join(', ')})` : ' (it has no thinking control)'}.` };
    }
    const metadata = modelMetadata(row.model);
    for (const field of ['provider', 'origin'] as const) {
        const wanted = row[field];
        if (wanted && metadata[field]?.toLowerCase() !== wanted.toLowerCase()) {
            return { kind: 'incompatible', reason: `${field}=${wanted} is required, but the declared ${field} of ${row.model} is ${metadata[field] ?? 'unknown'} (unknown metadata never satisfies a restriction).` };
        }
    }
    if (await context.pool.rejectsModel(plugin.id, row.model)) {
        const known = await context.pool.models(plugin.id);
        return { kind: 'incompatible', reason: `Model ${row.model} is not offered by ${plugin.displayName} (known: ${known.slice(0, 8).join(', ')}${known.length > 8 ? ', …' : ''}).` };
    }
    if (options.tool) {
        const instance = context.pool.instance(options.tool);
        if (!instance?.isEnabled || harnessPluginId(instance.variant) !== plugin.id) return { kind: 'incompatible', reason: `The harness tool "${options.tool}" is ${instance ? (instance.isEnabled ? `not a ${plugin.displayName} tool` : 'disabled') : 'not configured'}.` };
    }
    const instances = options.tool ? [context.pool.instance(options.tool)!] : context.pool.instancesFor(plugin.id, row.runtime);
    // Without any enabled harness the engine waits for tools; that is a resource wait, never an impossibility.
    if (!instances.length && !context.pool.enabled().length) return { kind: 'blocked', reason: 'No harness tool is enabled for this project.', next: 'Add or enable one: `ptbk tool list`, then `ptbk tool enable <name>` or `ptbk tool add HARNESS …`.' };
    if (!instances.length) {
        return {
            kind: 'incompatible',
            reason: `No enabled ${plugin.displayName} tool is configured${endpointLabel(row.runtime)}, which MODEL ${formatModelRow(row)} requires.`,
            next: `Add or enable one (ptbk tool add HARNESS --variant ${plugin.variant} --name ${plugin.id}), or change the MODEL requirement.`,
        };
    }
    const tool = options.tool ? context.pool.select(plugin.id, { tool: options.tool }) : context.pool.select(plugin.id, { runtime: row.runtime });
    if (!tool) {
        const states = instances.map((instance) => `${instance.name}: ${context.pool.inspectionOf(instance.name)?.summary ?? 'not inspected yet'}`);
        return { kind: 'blocked', reason: `${plugin.displayName} is not usable now (${states.join('; ')}).`, next: instances.map((instance) => context.pool.inspectionOf(instance.name)?.nextAction).find(Boolean) };
    }
    const inspection = context.pool.inspectionOf(tool.name) ?? context.pool.inspection(plugin.id)!;
    const sameVariant = context.pool.instancesFor(plugin.id, row.runtime).length > 1;
    const selection: RoutingSelection = {
        agent: agent.name,
        harness: plugin.id,
        tool: tool.name,
        model: row.model,
        thinkingLevel: row.thinking,
        runtime: toolRuntime(tool),
        baseUrl: context.pool.baseUrl(tool),
        sources: { ...options.sources, ...(sameVariant ? { tool: `first usable ${plugin.displayName} instance${endpointLabel(row.runtime)} in ptbk.json tools order` } : options.tool ? { tool: `explicit instance (${options.tool})` } : {}) },
    };
    return { kind: 'routable', agent, selection, plugin, inspection };
}

/**
 * Deterministically completes a constraint with plugin-coded defaults (finite commands, Markdown tasks, the Router
 * bootstrap and repair work): the first alternative a usable enabled tool can serve, in `tools` order, filling
 * unresolved dimensions from the plugin's defaults. Never relaxes an explicit field.
 *
 * @private routing
 */
export async function completeWithDefaults(
    constraint: ModelConstraint,
    context: RoutingContext,
    options: { readonly selectors?: readonly string[]; readonly agentName?: string; readonly includeUnusable?: boolean } = {},
): Promise<{ readonly row?: ModelRow; readonly reason?: string; readonly impossible?: boolean }> {
    if (isImpossible(constraint)) return { reason: 'The agent and task MODEL requirements contradict each other.', impossible: true };
    const reasons: string[] = [];
    let anyInstance = false;
    for (const row of constraint.rows) {
        const variants = row.harness ? [harnessPluginId(row.harness)] : context.pool.enabled();
        for (const id of variants) {
            const plugin = harnessPlugin(id);
            if (!plugin) continue;
            if (row.thinking && !plugin.thinkingLevels.includes(row.thinking)) continue;
            const instances = context.pool.instancesFor(id, row.runtime);
            if (!instances.length) continue;
            anyInstance = true;
            const tool = context.pool.select(id, { runtime: row.runtime }) ?? (options.includeUnusable ? instances[0] : undefined);
            if (!tool) {
                reasons.push(`${plugin.displayName} is not usable now`);
                continue;
            }
            const defaults = await context.pool.defaults(id);
            const candidates = row.model ? [row.model] : [...new Set([defaults.model, ...(await context.pool.models(id))].filter((model): model is string => Boolean(model)))];
            const model = candidates.find((candidate) => {
                const metadata = modelMetadata(candidate);
                return rowAllows({ provider: row.provider, origin: row.origin }, { harness: plugin.variant, model: candidate, runtime: toolRuntime(tool), ...metadata }) && selectorsMatch(options.selectors ?? [], options.agentName ?? '', id, candidate);
            });
            if (!model) {
                reasons.push(`no ${plugin.displayName} model satisfies ${formatModelRow(row)}`);
                continue;
            }
            const thinking = plugin.thinkingLevels.length ? (row.thinking ?? defaults.thinkingLevel) : undefined;
            const completed = intersectRows(row, { harness: plugin.variant, model, ...(thinking ? { thinking } : {}), runtime: toolRuntime(tool) });
            if (completed) return { row: completed };
        }
    }
    if (!anyInstance) return { reason: `No enabled harness tool can serve ${describeModel(constraint)}.`, impossible: true };
    return { reason: reasons.length ? [...new Set(reasons)].join('; ') : `Nothing usable satisfies ${describeModel(constraint)}.` };
}

/**
 * Routes with deterministic defaults (no Router): used where an operation's own configuration decides, never for
 * ordinary queued Book tasks.
 *
 * @private routing
 */
export async function routeWithDefaults(agent: EffectiveAgent, requirement: ModelConstraint, context: RoutingContext, options: { readonly selectors?: readonly string[]; readonly tool?: string; readonly sources?: RoutingSelection['sources'] } = {}): Promise<RouteResolution> {
    const constraint = executionConstraint(agent, requirement);
    if (isImpossible(constraint)) return { kind: 'incompatible', reason: `${agent.name}'s MODEL (${describeModel(agent.model)}) contradicts the requirement ${describeModel(requirement)}.` };
    let constrained = constraint;
    if (options.tool) {
        const instance = context.pool.instance(options.tool);
        if (instance) constrained = intersectModels(constraint, { rows: [{ harness: instance.variant, runtime: toolRuntime(instance) }], explicit: true });
    }
    const completed = await completeWithDefaults(constrained, context, { selectors: options.selectors, agentName: agent.name });
    if (!completed.row) {
        if (completed.impossible) return { kind: 'incompatible', reason: completed.reason ?? 'No compatible combination exists.' };
        if (!context.pool.enabled().length) return { kind: 'blocked', reason: 'No harness tool is enabled for this project.', next: 'Add or enable one: `ptbk tool list`, then `ptbk tool enable <name>` or `ptbk tool add HARNESS …`.' };
        return { kind: 'blocked', reason: completed.reason ?? 'No usable harness.' };
    }
    return await routeConcrete(agent, completed.row, context, { tool: options.tool, sources: { agent: options.sources?.agent, harness: 'plugin default in tools order', model: completed.row.model === requirement.rows[0]?.model ? 'requirement' : 'plugin default', thinkingLevel: 'plugin default', ...options.sources } });
}

/**
 * Resolves the agent and concrete execution of a task without calling any model.
 *
 * A Book task runs only with a fully determined compatible MODEL (the intersection of its agent's and its own); any
 * unresolved choice is Router's ordinary assignment work. Explicit requirements are never silently replaced:
 * contradictions and combinations no configured tool can serve are `incompatible`, temporary unavailability is a wait.
 *
 * @private routing
 */
export async function resolveRoute(task: Task, context: RoutingContext): Promise<RouteResolution> {
    const book = task.source.kind === 'book';
    if (book && !task.priority.resolved) return { kind: 'needs-assignment', reason: `TASK PRIORITY "${task.priority.raw}" needs interpretation; Router will resolve it with the routing.` };
    let agentReference = task.routing.agent;
    let agentSource = 'task requirement (TASK AGENT)';
    if (!agentReference) {
        if (book) return { kind: 'needs-assignment', reason: 'No TASK AGENT yet; Router will assign it first.' };
        agentReference = setting<string>(context.settings, 'routing.defaultAgent');
        agentSource = `default agent (routing.defaultAgent from ${context.settings.sources['routing.defaultAgent'] ?? 'default'})`;
    }
    const agent = await resolveEffectiveAgent(context.catalog, toReference(agentReference));
    const agentErrors = agent.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (agentErrors.length) {
        return { kind: 'blocked', reason: agentErrors.map((diagnostic) => `${diagnostic.path ? `${diagnostic.path}: ` : ''}${diagnostic.message}`).join(' '), next: 'Fix the agent definition or the TASK AGENT reference.' };
    }
    const constraint = executionConstraint(agent, task.routing.model);
    if (isImpossible(constraint)) {
        return { kind: 'incompatible', reason: `${agent.name}'s MODEL (${describeModel(agent.model)}) and the task's MODEL (${describeModel(task.routing.model)}) have no combination in common.`, next: 'Change one of the MODEL requirements (Fixer gets a repair task).' };
    }
    // Markdown sections cannot receive Router's committed refinement: their default agent runs with plugin defaults.
    if (!book) return await routeWithDefaults(agent, task.routing.model, context, { selectors: task.routing.runners, sources: { agent: agentSource } });
    const row = determinedRow(constraint, hasThinking);
    if (!row) return { kind: 'needs-assignment', reason: `MODEL is not fully determined (${describeModel(constraint)}); Router completes it.` };
    if (!selectorsMatch(task.routing.runners, agent.name, harnessPluginId(row.harness!), row.model)) {
        return { kind: 'incompatible', reason: `Selectors ${task.routing.runners.map((selector) => `\`${selector}\``).join(' ')} do not match ${agent.name} with ${formatModelRow(row)}.` };
    }
    const modelSource = task.routing.model.explicit ? `MODEL of ${task.ref}${task.routing.legacyControls ? ' (former TASK controls)' : ''}` : `MODEL of ${agent.name}`;
    return await routeConcrete(agent, row, context, { sources: { agent: agentSource, harness: modelSource, model: modelSource, thinkingLevel: row.thinking ? modelSource : undefined, runtime: modelSource } });
}

/**
 * Execution of a read-only turn outside the queue (a TEAM consultation, a chat routing call): the agent's MODEL
 * within read-only-capable harnesses, completed with plugin defaults and preferring the given harness.
 *
 * @private routing
 */
export async function readOnlyRoute(agent: EffectiveAgent, preferredHarness: string | undefined, context: RoutingContext, requirement: ModelConstraint = UNCONSTRAINED): Promise<RouteResolution> {
    const readOnly = [preferredHarness, ...context.pool.usable()].filter((id, index, all): id is string => Boolean(id) && all.indexOf(id) === index && Boolean(harnessPlugin(id!)?.capabilities.readOnly));
    if (!readOnly.length) return { kind: 'blocked', reason: 'No usable harness supports read-only turns.' };
    const allowed: ModelConstraint = { rows: readOnly.map((id) => ({ harness: harnessPlugin(id)!.variant })), explicit: true };
    const constraint = intersectModels(executionConstraint(agent, requirement), allowed);
    const determined = determinedRow(constraint.rows.length ? { rows: [constraint.rows[0]!], explicit: true } : constraint, hasThinking);
    if (determined) return await routeConcrete(agent, determined, context);
    const completed = await completeWithDefaults(constraint, context, { agentName: agent.name });
    if (!completed.row) return completed.impossible ? { kind: 'incompatible', reason: completed.reason ?? `${agent.name}'s MODEL cannot be served read-only.` } : { kind: 'blocked', reason: completed.reason ?? 'No usable read-only harness.' };
    return await routeConcrete(agent, completed.row, context);
}
