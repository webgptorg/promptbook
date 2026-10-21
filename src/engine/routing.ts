import { normalizeAgentName, referenceName, toReference } from '../book/references.js';
import { setting, type EffectiveSettings, type ThinkingLevel } from '../project/config.js';
import { resolveEffectiveAgent, type AgentCatalog, type EffectiveAgent } from '../project/agents.js';
import { harnessName, harnessPlugin } from '../harness/registry.js';
import { harnessPluginId, harnessVariantOf } from '../tools/model.js';
import type { HarnessInspection, HarnessPlugin } from '../harness/types.js';
import type { Task } from '../tasks/model.js';
import type { HarnessPool } from './harnesses.js';
import type { RoutingSelection } from './state.js';

/**
 * Fixed configuration of a finite run.
 *
 * @private routing
 */
export type RunSelection = {
    /** Agent reference. */
    readonly agent: string;
    /** Harness identifier. */
    readonly harness: string;
    /** Model. */
    readonly model?: string;
    /** Thinking level. */
    readonly thinkingLevel?: ThinkingLevel;
};

/**
 * Outcome of routing one task.
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
    | { readonly kind: 'incompatible'; readonly reason: string };

/**
 * Inputs of routing.
 *
 * @private routing
 */
export type RoutingContext = {
    /** `start` routes automatically (Manager for missing agents); `run` uses one fixed selection. */
    readonly mode: 'start' | 'run';
    /** Agent catalog. */
    readonly catalog: AgentCatalog;
    /** Harness availability. */
    readonly pool: HarnessPool;
    /** Effective settings. */
    readonly settings: EffectiveSettings;
    /** Fixed selection of a finite run. */
    readonly runSelection?: RunSelection;
};

/**
 * Any-of selector match against agent name, harness and model.
 */
function selectorsMatch(selectors: readonly string[], agentName: string, harness: string, model: string | undefined): boolean {
    if (!selectors.length) return true;
    const haystacks = [agentName.toLowerCase(), normalizeAgentName(agentName), harness.toLowerCase(), harnessName(harness).toLowerCase(), (model ?? '').toLowerCase()].filter(Boolean);
    return selectors.some((selector) => haystacks.some((haystack) => haystack.includes(selector.toLowerCase())));
}

/**
 * A harness requirement (variant such as `openai-codex`, or a configured tool instance name) as a variant plus an
 * optional explicit instance restriction.
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
 * Explains why a harness variant (or a named instance) cannot be used.
 */
function harnessUnavailable(id: string, context: RoutingContext, tool?: string): { reason: string; next?: string } | undefined {
    const plugin = harnessPlugin(id);
    if (!plugin) return { reason: `Harness "${id}" is not a supported integration or configured tool.`, next: 'Use one of: openai-codex, claude-code, github-copilot, cline, opencode, gemini, qwen-code, or a harness tool name from `ptbk tool list`.' };
    if (tool) {
        const instance = context.pool.instance(tool);
        if (!instance?.isEnabled) return { reason: `The harness tool "${tool}" is ${instance ? 'disabled' : 'not configured'}.`, next: instance ? `Enable it: ptbk tool enable ${tool}` : 'Add it with `ptbk tool add HARNESS …`.' };
        const inspection = context.pool.inspectionOf(tool);
        if (!inspection) return { reason: `${plugin.displayName} (${tool}) has not been inspected yet.` };
        if (!inspection.usable) return { reason: `${plugin.displayName} (${tool}): ${inspection.summary}`, next: inspection.nextAction };
        return undefined;
    }
    if (context.mode === 'start' && !context.pool.enabled().includes(id)) {
        return { reason: `No enabled ${plugin.displayName} tool is configured for this project.`, next: `Add or enable one: ptbk tool add HARNESS --variant ${plugin.variant} --name ${plugin.id}` };
    }
    if (context.pool.select(id)) return undefined;
    const instances = context.pool.instances(id);
    if (!instances.length) return { reason: `No ${plugin.displayName} tool is configured.`, next: `ptbk tool add HARNESS --variant ${plugin.variant} --name ${plugin.id}` };
    const inspections = instances.map((instance) => ({ instance, inspection: context.pool.inspectionOf(instance.name) }));
    if (inspections.every((entry) => !entry.inspection)) return { reason: `${plugin.displayName} has not been inspected yet.` };
    return {
        reason: `${plugin.displayName}: ${inspections.map((entry) => `${entry.instance.name}: ${entry.inspection?.summary ?? 'not inspected yet'}`).join('; ')}`,
        next: inspections.find((entry) => entry.inspection?.nextAction)?.inspection?.nextAction,
    };
}

/**
 * Resolves the agent, harness, model and thinking level of a task without calling any model.
 *
 * Explicit requirements are never silently replaced; unavailable ones block the task.
 *
 * @private routing
 */
export async function resolveRoute(task: Task, context: RoutingContext): Promise<RouteResolution> {
    const { settings } = context;
    const run = context.mode === 'run' ? context.runSelection : undefined;
    if (context.mode === 'start' && task.source.kind === 'book' && !task.priority.resolved) {
        return { kind: 'needs-assignment', reason: `TASK PRIORITY "${task.priority.raw}" needs interpretation; Manager will resolve it with the routing.` };
    }
    let agentReference = task.routing.agent;
    let agentSource = 'task requirement (TASK AGENT)';
    if (run) {
        agentSource = agentReference ? 'task requirement (TASK AGENT), matching this run' : 'run selection (--agent)';
        if (agentReference && normalizeAgentName(referenceName(agentReference)) !== normalizeAgentName(referenceName(run.agent))) {
            return { kind: 'incompatible', reason: `Requires agent ${agentReference}, but this run uses ${run.agent}.` };
        }
        agentReference = run.agent;
    } else if (!agentReference) {
        if (task.source.kind === 'book') return { kind: 'needs-assignment', reason: 'No TASK AGENT yet; Manager will assign routing first.' };
        agentReference = setting<string>(settings, 'routing.defaultAgent');
        agentSource = `default agent (routing.defaultAgent from ${settings.sources['routing.defaultAgent'] ?? 'default'})`;
    }
    const agent = await resolveEffectiveAgent(context.catalog, toReference(agentReference));
    const agentErrors = agent.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (agentErrors.length) {
        return { kind: 'blocked', reason: agentErrors.map((diagnostic) => `${diagnostic.path ? `${diagnostic.path}: ` : ''}${diagnostic.message}`).join(' '), next: 'Fix the agent definition or the TASK AGENT reference.' };
    }

    let candidates: Array<{ variant: string; tool?: string }>;
    const required = task.routing.harness ? harnessRequirement(task.routing.harness, context.pool) : undefined;
    if (task.routing.harness && !required) return { kind: 'blocked', reason: `TASK HARNESS ${task.routing.harness} is neither a supported harness variant nor a configured harness tool.`, next: 'Use a variant such as openai-codex or a name from `ptbk tool list`.' };
    if (run) {
        const selected = harnessRequirement(run.harness, context.pool) ?? { variant: run.harness };
        if (required && (required.variant !== selected.variant || (required.tool && selected.tool && required.tool !== selected.tool))) return { kind: 'incompatible', reason: `Requires harness ${task.routing.harness}, but this run uses ${run.harness}.` };
        if (task.routing.model && run.model && task.routing.model !== run.model) return { kind: 'incompatible', reason: `Requires model ${task.routing.model}, but this run uses ${run.model}.` };
        if (task.routing.thinkingLevel && run.thinkingLevel && task.routing.thinkingLevel !== run.thinkingLevel) {
            return { kind: 'incompatible', reason: `Requires thinking level ${task.routing.thinkingLevel}, but this run uses ${run.thinkingLevel}.` };
        }
        candidates = [{ variant: selected.variant, tool: required?.tool ?? selected.tool }];
    } else if (required) {
        candidates = [required];
    } else {
        candidates = context.pool.usable().map((variant) => ({ variant }));
        if (!candidates.length) {
            const enabled = context.pool.enabled();
            if (!enabled.length) return { kind: 'blocked', reason: 'No harness tool is enabled for this project.', next: 'Add or enable one: `ptbk tool list`, then `ptbk tool enable <name>` or `ptbk tool add HARNESS …`.' };
            const problems = enabled.map((id) => harnessUnavailable(id, context)).filter(Boolean) as Array<{ reason: string; next?: string }>;
            return { kind: 'blocked', reason: `No enabled harness is usable: ${problems.map((problem) => problem.reason).join(' ')}`, next: problems.find((problem) => problem.next)?.next };
        }
    }
    for (const candidate of candidates) {
        const harness = candidate.variant;
        const unavailable = harnessUnavailable(harness, context, candidate.tool);
        if (unavailable) {
            if (candidates.length === 1) return { kind: 'blocked', ...unavailable };
            continue;
        }
        const plugin = harnessPlugin(harness)!;
        const instance = context.pool.select(harness, { tool: candidate.tool }) ?? context.pool.instances(harness)[0];
        const inspection = (instance ? context.pool.inspectionOf(instance.name) : undefined) ?? context.pool.inspection(harness)!;
        const isDefaultHarness = setting<string | undefined>(settings, 'routing.harness') === harness;
        let model = run?.model ?? task.routing.model ?? instance?.model ?? (isDefaultHarness ? setting<string | undefined>(settings, 'routing.model') : undefined);
        let modelSource = run?.model
            ? 'run selection (--model)'
            : task.routing.model
              ? 'task requirement (TASK MODEL)'
              : instance?.model
                ? `ptbk.json tools "${instance.name}".model`
                : model
                  ? `routing.model (${settings.sources['routing.model'] ?? 'default'})`
                  : undefined;
        if (task.routing.runners.length && !selectorsMatch(task.routing.runners, agent.name, harness, model)) {
            if (run) return { kind: 'incompatible', reason: `Selectors ${task.routing.runners.map((selector) => `\`${selector}\``).join(' ')} do not match this run's configuration.` };
            const catalogModel = (await context.pool.models(harness)).find((candidateModel) => selectorsMatch(task.routing.runners, '', '', candidateModel));
            if (!catalogModel) continue;
            model = catalogModel;
            modelSource = 'task selector (TASK RUNNER)';
        }
        const explicitModel = run?.model ?? task.routing.model;
        if (explicitModel) {
            const known = await context.pool.models(harness);
            if (known.length && !known.includes(explicitModel)) {
                return { kind: 'blocked', reason: `Model ${explicitModel} is not offered by ${plugin.displayName} (known: ${known.slice(0, 8).join(', ')}${known.length > 8 ? ', …' : ''}).`, next: 'Choose an available model.' };
            }
        }
        const explicitThinking = run?.thinkingLevel ?? task.routing.thinkingLevel;
        let thinkingLevel: ThinkingLevel | undefined = explicitThinking ?? instance?.thinkingLevel ?? (isDefaultHarness ? setting<ThinkingLevel | undefined>(settings, 'routing.thinkingLevel') : undefined);
        if (thinkingLevel && !plugin.thinkingLevels.includes(thinkingLevel)) {
            if (explicitThinking) {
                return {
                    kind: 'blocked',
                    reason: `${plugin.displayName} does not support thinking level ${thinkingLevel}${plugin.thinkingLevels.length ? ` (supported: ${plugin.thinkingLevels.join(', ')})` : ''}.`,
                };
            }
            thinkingLevel = undefined;
        }
        const thinkingSource = !thinkingLevel
            ? undefined
            : run?.thinkingLevel
              ? 'run selection (--thinking-level)'
              : task.routing.thinkingLevel
                ? 'task requirement (TASK THINKING LEVEL)'
                : instance?.thinkingLevel
                  ? `ptbk.json tools "${instance.name}".thinkingLevel`
                  : `routing.thinkingLevel (${settings.sources['routing.thinkingLevel'] ?? 'default'})`;
        const harnessSource = run ? 'run selection (--harness)' : task.routing.harness ? 'task requirement (TASK HARNESS)' : isDefaultHarness ? `preferred harness (routing.harness from ${settings.sources['routing.harness'] ?? 'default'})` : 'automatic (first usable enabled harness)';
        const toolSource = candidate.tool ? `explicit instance (${candidate.tool})` : instance && context.pool.instances(harness).length > 1 ? `first usable ${plugin.displayName} instance in ptbk.json tools order` : undefined;
        const sources = { agent: agentSource, harness: harnessSource, ...(toolSource ? { tool: toolSource } : {}), ...(modelSource ? { model: modelSource } : {}), ...(thinkingSource ? { thinkingLevel: thinkingSource } : {}) };
        return { kind: 'routable', agent, selection: { agent: agent.name, harness, tool: instance?.name, model, thinkingLevel, sources }, plugin, inspection };
    }
    return { kind: 'blocked', reason: `No usable harness/model matches selectors ${task.routing.runners.map((selector) => `\`${selector}\``).join(' ')}.` };
}
