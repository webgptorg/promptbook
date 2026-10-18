import { normalizeAgentName, referenceName } from '../book/references.js';
import { setting, type EffectiveSettings, type ThinkingLevel } from '../project/config.js';
import { resolveEffectiveAgent, type AgentCatalog, type EffectiveAgent } from '../project/agents.js';
import { harnessName, harnessPlugin } from '../harness/registry.js';
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
 * Explains why a harness cannot be used.
 */
function harnessUnavailable(id: string, context: RoutingContext): { reason: string; next?: string } | undefined {
    const plugin = harnessPlugin(id);
    if (!plugin) return { reason: `Harness "${id}" is not a supported integration.`, next: 'Use one of: openai-codex, claude-code, github-copilot, cline, opencode, gemini, qwen-code.' };
    if (context.mode === 'start' && !context.pool.enabled().includes(id)) {
        return { reason: `Harness ${plugin.displayName} is not enabled for this project.`, next: `Enable it with \`ptbk init --harness ${id}\` or in ptbk.json.` };
    }
    const inspection = context.pool.inspection(id);
    if (!inspection) return { reason: `${plugin.displayName} has not been inspected yet.` };
    if (!inspection.usable) return { reason: `${plugin.displayName}: ${inspection.summary}`, next: inspection.nextAction };
    return undefined;
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
    if (run) {
        if (agentReference && normalizeAgentName(referenceName(agentReference)) !== normalizeAgentName(referenceName(run.agent))) {
            return { kind: 'incompatible', reason: `Requires agent ${agentReference}, but this run uses ${run.agent}.` };
        }
        agentReference = run.agent;
    } else if (!agentReference) {
        if (task.source.kind === 'book') return { kind: 'needs-assignment', reason: 'No TASK AGENT yet; Manager will assign routing first.' };
        agentReference = setting<string>(settings, 'routing.defaultAgent');
    }
    const agent = await resolveEffectiveAgent(context.catalog, agentReference.startsWith('@') || agentReference.startsWith('{') ? agentReference : `{{${agentReference}}}`);
    const agentErrors = agent.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (agentErrors.length) {
        return { kind: 'blocked', reason: agentErrors.map((diagnostic) => `${diagnostic.path ? `${diagnostic.path}: ` : ''}${diagnostic.message}`).join(' '), next: 'Fix the agent definition or the TASK AGENT reference.' };
    }

    let candidates: string[];
    if (run) {
        if (task.routing.harness && task.routing.harness !== run.harness) return { kind: 'incompatible', reason: `Requires harness ${task.routing.harness}, but this run uses ${run.harness}.` };
        if (task.routing.model && run.model && task.routing.model !== run.model) return { kind: 'incompatible', reason: `Requires model ${task.routing.model}, but this run uses ${run.model}.` };
        if (task.routing.thinkingLevel && run.thinkingLevel && task.routing.thinkingLevel !== run.thinkingLevel) {
            return { kind: 'incompatible', reason: `Requires thinking level ${task.routing.thinkingLevel}, but this run uses ${run.thinkingLevel}.` };
        }
        candidates = [run.harness];
    } else if (task.routing.harness) {
        candidates = [task.routing.harness];
    } else {
        candidates = context.pool.usable();
        if (!candidates.length) {
            const enabled = context.pool.enabled();
            if (!enabled.length) return { kind: 'blocked', reason: 'No harness is enabled for this project.', next: 'Run `ptbk init` to select and set up a harness.' };
            const problems = enabled.map((id) => harnessUnavailable(id, context)).filter(Boolean) as Array<{ reason: string; next?: string }>;
            return { kind: 'blocked', reason: `No enabled harness is usable: ${problems.map((problem) => problem.reason).join(' ')}`, next: problems.find((problem) => problem.next)?.next };
        }
    }
    for (const harness of candidates) {
        const unavailable = harnessUnavailable(harness, context);
        if (unavailable) {
            if (candidates.length === 1) return { kind: 'blocked', ...unavailable };
            continue;
        }
        const plugin = harnessPlugin(harness)!;
        const inspection = context.pool.inspection(harness)!;
        const harnessSettings = settings.harnesses[harness];
        const isDefaultHarness = setting<string | undefined>(settings, 'routing.harness') === harness;
        let model = run?.model ?? task.routing.model ?? harnessSettings?.model ?? (isDefaultHarness ? setting<string | undefined>(settings, 'routing.model') : undefined);
        if (task.routing.runners.length && !selectorsMatch(task.routing.runners, agent.name, harness, model)) {
            if (run) return { kind: 'incompatible', reason: `Selectors ${task.routing.runners.map((selector) => `\`${selector}\``).join(' ')} do not match this run's configuration.` };
            const catalogModel = (await context.pool.models(harness)).find((candidate) => selectorsMatch(task.routing.runners, '', '', candidate));
            if (!catalogModel) continue;
            model = catalogModel;
        }
        const explicitModel = run?.model ?? task.routing.model;
        if (explicitModel) {
            const known = await context.pool.models(harness);
            if (known.length && !known.includes(explicitModel)) {
                return { kind: 'blocked', reason: `Model ${explicitModel} is not offered by ${plugin.displayName} (known: ${known.slice(0, 8).join(', ')}${known.length > 8 ? ', …' : ''}).`, next: 'Choose an available model.' };
            }
        }
        const explicitThinking = run?.thinkingLevel ?? task.routing.thinkingLevel;
        let thinkingLevel: ThinkingLevel | undefined = explicitThinking ?? harnessSettings?.thinkingLevel ?? (isDefaultHarness ? setting<ThinkingLevel | undefined>(settings, 'routing.thinkingLevel') : undefined);
        if (thinkingLevel && !plugin.thinkingLevels.includes(thinkingLevel)) {
            if (explicitThinking) {
                return {
                    kind: 'blocked',
                    reason: `${plugin.displayName} does not support thinking level ${thinkingLevel}${plugin.thinkingLevels.length ? ` (supported: ${plugin.thinkingLevels.join(', ')})` : ''}.`,
                };
            }
            thinkingLevel = undefined;
        }
        return { kind: 'routable', agent, selection: { agent: agent.name, harness, model, thinkingLevel }, plugin, inspection };
    }
    return { kind: 'blocked', reason: `No usable harness/model matches selectors ${task.routing.runners.map((selector) => `\`${selector}\``).join(' ')}.` };
}
