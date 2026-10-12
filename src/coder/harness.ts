import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prepareAgent } from './agents.js';
import { advisorTools, createToolBridge } from './team.js';
import type { BridgeTool, TeamBudget, ToolBridge } from './team.js';
/** Provider requests accept host-owned capabilities from the shared bridge contract. @private */
export type { BridgeTool } from './team.js';
/** Shared process APIs retain their established runtime exports. @private */
export { loadProjectSecrets, redactSecrets, runProcess, resolveProcessCommand, prepareProcessArguments, classifyHarnessResult, DEFAULT_PROCESS_TIMEOUT_MS } from './harness-process.js';
/** Shared subprocess and protocol contracts. @private */
export type { ProcessOptions, ProcessProtocol, ProcessResult } from './harness-process.js';
import { redactSecrets, classifyHarnessResult } from './harness-process.js';

/** Explicit outcomes used by the shared execution engine. @private */
export type HarnessOutcome = 'success' | 'configuration' | 'authentication' | 'quota' | 'transient' | 'process-failure' | 'cancelled';

/** One immutable inference request; task text is never interpolated into shell code. @private */
export interface HarnessRequest {
    harness: string; projectPath: string; prompt: string; agentPath?: string; context?: string;
    model?: string; thinkingLevel?: string; allowCredits?: boolean; signal?: AbortSignal; onOutput?: (chunk: string) => void;
    readOnly?: boolean; tools?: BridgeTool[]; teamBudget?: TeamBudget; maxOutputBytes?: number; timeoutMs?: number;
    sessionId?: string; redactionPath?: string;
    taskId?: string; occurrenceId?: string; requestProjectPath?: string; harnessConfiguration?: HarnessConfiguration;
}

/** Provider report with actual process status and provider-reported usage. @private */
export interface HarnessResult {
    outcome: HarnessOutcome; exitCode: number | null; output: string; usage?: Record<string, number>; sessionId?: string;
    signal?: NodeJS.Signals | null; authentication?: 'account' | 'api' | 'unknown'; effectiveModel?: string; harnessVersion?: string;
    quotaResetAt?: number;
    acceptance?: { satisfied: boolean; evidence: string };
    externalEffects?: boolean;
}

/** Harness plugin metadata shared by setup and runtime. @private */
export type { HarnessDefinition } from './harness-plugins/contract.js';
import type { HarnessDefinition, HarnessConfiguration } from './harness-plugins/contract.js';
import { HARNESS_PLUGINS, getHarnessPlugin } from './harness-plugins/index.js';
import { acquireHarnessUsage } from './harness-plugins/locks.js';

/** Registry metadata is the single source for runtime selection and CLI help. @private */
export const HARNESS_REGISTRY: readonly HarnessDefinition[] = HARNESS_PLUGINS.map((plugin) => plugin.definition);

/** Resolve a known harness or throw an actionable configuration error. @private */
export function getHarness(name: string): HarnessDefinition {
    const harness = HARNESS_REGISTRY.find((entry) => entry.name === name);
    if (!harness) throw new Error(`Unknown harness ${name}; choose ${HARNESS_REGISTRY.map((entry) => entry.name).join(', ')}`);
    return harness;
}

/** A bounded searchable catalog keeps ordinary integrations accessible without selecting them. @private */
export interface HarnessCatalogOptions {
    includeMore?: boolean; query?: string; offset?: number; limit?: number; selected?: readonly string[];
}

/** Return featured names and existing selections by default; More exposes the full searchable catalog. @private */
export function getHarnessCatalog(options: HarnessCatalogOptions = {}): HarnessDefinition[] {
    const selected = new Set(options.selected || []);
    const query = options.query?.trim().toLowerCase();
    const entries = HARNESS_REGISTRY.filter((entry) => (options.includeMore || query || entry.featured || selected.has(entry.id)) && (!query || entry.id.includes(query) || entry.displayName.toLowerCase().includes(query)));
    const offset = Number.isFinite(options.offset) ? Math.max(0, Math.floor(options.offset!)) : 0;
    const limit = Number.isFinite(options.limit) ? Math.min(100, Math.max(1, Math.floor(options.limit!))) : 20;
    return entries.slice(offset, offset + limit);
}

/** Treat reported native execution as potentially external unless it is a known read-only host tool. */
function reportsExternalExecution(event: Record<string, unknown>, tools: BridgeTool[]): boolean {
    if (event.externalEffects === true) return true;
    const message = event.message as { content?: unknown[] } | undefined;
    const records = [event, event.item, event.part, event.update, ...(Array.isArray(message?.content) ? message.content : [])];
    return records.some(value => {
        if (!value || typeof value !== 'object') return false;
        const record = value as Record<string, unknown>;
        const kind = String(record.type || record.sessionUpdate || '').replace(/[^a-z]/gi, '').toLowerCase();
        if (!/^(?:commandexecution|mcp(?:tool)?call|tool(?:use|call|callupdate|execution(?:start|complete|end)?)|websearch(?:call)?)$/.test(kind)) return false;
        const data = record.data as Record<string, unknown> | undefined;
        const part = event.part as Record<string, unknown> | undefined;
        const name = record.toolName || record.tool_name || record.tool || record.name || data?.toolName || part?.tool;
        const host = typeof name === 'string' ? tools.find(tool => name === tool.name || name.endsWith(`__ptbk__${tool.name}`) || name === `ptbk-${tool.name}` || name === `mcp:ptbk-${tool.name}`) : undefined;
        return !host || host.readOnly === false;
    });
}

/** Extract structured usage, execution and session reports without counting summaries twice. @private */
function providerMetadata(output: string, tools: BridgeTool[]): { usage?: Record<string, number>; sessionId?: string; quotaResetAt?: number; effectiveModel?: string; acceptance?: HarnessResult['acceptance']; externalEffects?: boolean } {
    let usage: Record<string, number> | undefined;
    let sessionId: string | undefined;
    let quotaResetAt: number | undefined;
    let effectiveModel: string | undefined;
    let acceptance: HarnessResult['acceptance'];
    let externalEffects = false;
    const steps = new Map<string, Record<string, number>>();
    for (const line of output.split('\n')) {
        try {
            const event = JSON.parse(line) as Record<string, unknown>;
            externalEffects ||= reportsExternalExecution(event, tools);
            const candidates: unknown[] = [event.acceptance];
            const item = event.item as { type?: string; text?: string } | undefined;
            const partMessage = event.part as { type?: string; text?: string } | undefined;
            const assistantText = item?.type === 'agent_message' || item?.type === 'agentMessage' ? item.text : event.type === 'result' && typeof event.result === 'string' ? event.result : event.type === 'text' && partMessage?.type === 'text' ? partMessage.text : undefined;
            if (assistantText) for (const line of assistantText.split('\n')) {
                try { const report = JSON.parse(line) as { acceptance?: unknown }; candidates.push(report.acceptance); } catch { /* Only explicit structured assistant reports are acceptance evidence. */ }
            }
            for (const candidate of candidates) {
                const verification = candidate as { satisfied?: unknown; evidence?: unknown } | undefined;
                if (typeof verification?.satisfied === 'boolean' && typeof verification.evidence === 'string') acceptance = { satisfied: verification.satisfied, evidence: verification.evidence.slice(0, 128_000) };
            }
            const reported = event.usage || (event.result as Record<string, unknown> | undefined)?.usage || (event.type === 'result' ? event.stats : undefined);
            if (reported && typeof reported === 'object') {
                const values = Object.entries(reported).filter(([name, value]) => typeof value === 'number' && Number.isFinite(value) && (reported !== event.stats || /token|cached|^input$/.test(name)));
                if (values.length) usage = Object.fromEntries(values) as Record<string, number>;
            }
            const part = event.part as Record<string, unknown> | undefined;
            if (event.type === 'step_finish' && typeof part?.id === 'string' && part.tokens && typeof part.tokens === 'object') {
                const tokens = part.tokens as Record<string, unknown>;
                const values = Object.fromEntries(Object.entries(tokens).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))) as Record<string, number>;
                const cache = tokens.cache as Record<string, unknown> | undefined;
                for (const name of ['read', 'write']) if (typeof cache?.[name] === 'number' && Number.isFinite(cache[name])) values[`cache_${name}`] = cache[name];
                if (typeof part.cost === 'number' && Number.isFinite(part.cost)) values.cost = part.cost;
                steps.set(part.id, values);
            }
            const id = event.thread_id || event.session_id || event.sessionID;
            if (typeof id === 'string') sessionId = id;
            if (typeof event.model === 'string') effectiveModel = event.model;
            const limit = (event.rate_limit_info || event.error || event) as Record<string, unknown>;
            const reset = limit.resetsAt || limit.reset_at || limit.resetAt;
            if (typeof reset === 'number' && Number.isFinite(reset) && reset > 0) quotaResetAt = reset < 1_000_000_000_000 ? reset * 1000 : reset;
            else if (typeof reset === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(reset) && Number.isFinite(Date.parse(reset))) quotaResetAt = Date.parse(reset);
        } catch { /* Plain provider output is a supported fallback. */ }
    }
    if (steps.size) {
        usage = {};
        for (const values of steps.values()) for (const [name, value] of Object.entries(values)) usage[name] = (usage[name] || 0) + value;
    }
    return { ...(usage ? { usage } : {}), ...(sessionId ? { sessionId } : {}), ...(quotaResetAt ? { quotaResetAt } : {}), ...(effectiveModel ? { effectiveModel } : {}), ...(acceptance ? { acceptance } : {}), ...(externalEffects ? { externalEffects } : {}) };
}

/** Execute one provider turn, with immutable agent context and actual on-demand TEAM tools. @private */
export async function runHarness(request: HarnessRequest): Promise<HarnessResult> {
    let releaseUsage: (() => Promise<void>) | undefined;
    let bridge: ToolBridge | undefined;
    let cleanup: (() => Promise<void>) | undefined;
    let authentication: 'account' | 'api' | 'unknown' = 'unknown';
    let harnessVersion: string | undefined;
    const budget = request.teamBudget || { calls: 0, depth: 0, usage: {} };
    const requestedModel = request.model;
    const sourceSecret = request.harnessConfiguration?.apiKeyEnv ? process.env[request.harnessConfiguration.apiKeyEnv] : undefined;
    /** Recognize explicit credential references before even failed native metadata probes. */
    const redacted = (text: string) => {
        const safe = redactSecrets(text, request.redactionPath || request.projectPath);
        return sourceSecret ? safe.split(sourceSecret).join('[REDACTED]') : safe;
    };
    try {
        if (request.signal?.aborted) return { outcome: 'cancelled', exitCode: null, output: 'Harness cancelled before startup.' };
        const plugin = getHarnessPlugin(request.harness);
        const harness = plugin.definition;
        releaseUsage = await acquireHarnessUsage(harness.id, { signal: request.signal });
        if (request.readOnly && !harness.readOnlyTools) throw new Error(`${harness.name} lacks verified isolation from native shell, writes and external tools for read-only advisors. No model call was made. Select a harness with verified read-only tool capability.`);
        if (request.thinkingLevel && !harness.thinkingLevels.includes(request.thinkingLevel)) throw new Error(`${harness.name} does not support --thinking-level ${request.thinkingLevel}; supported: ${harness.thinkingLevels.join(', ') || 'none'}`);
        const help = await plugin.help(request);
        harnessVersion = await plugin.version(request);
        const env = { ...process.env };
        await plugin.configure(request, env);
        authentication = await plugin.authenticate(request, env);
        const agent = request.agentPath ? await prepareAgent(request.agentPath, request.projectPath) : undefined;
        if (agent?.team.length && !harness.readOnlyTools) throw new Error(`${harness.name} lacks verified read-only advisor capability; TEAM is refused before inference. Select a harness with verified TEAM support. No model call was made.`);
        if (agent?.modelParameters) throw new Error(`Agent MODEL parameters are not supported by the selected CLI adapter: ${Object.keys(agent.modelParameters).join(', ')}. Remove those parameters or configure a verified native provider capability; no model call was made.`);
        if (request.model === undefined && agent?.model) request = { ...request, model: agent.model };
        if (harness.teamModelRequirement && agent?.team.length && (!requestedModel || requestedModel === 'default')) throw new Error('OpenCode TEAM requires explicit --model provider/model for isolated advisors. No primary model call was made. Ordinary execution without TEAM retains native model configuration.');
        const readTools = request.tools || (request.readOnly ? (await import('./planner.js')).planningReadTools(request.projectPath) : []);
        const tools = [...readTools, ...advisorTools(agent?.team || [], budget, async (member, question, signal, childBudget) => {
            if (member.kind === 'user' || member.path === 'ptbk:user') {
                const { resolveWorkspace } = await import('./workspace.js');
                const { createRequest, waitForAnswer } = await import('./requests.js');
                const workspace = await resolveWorkspace({ path: request.requestProjectPath || request.redactionPath || request.projectPath });
                const human = await createRequest(workspace, { kind: 'question', taskId: request.taskId, activityId: request.occurrenceId, reason: 'The responsible agent requested human project context through TEAM @User.', prompt: question });
                const answer = await waitForAnswer(workspace, human.id, signal);
                return { output: answer };
            }
            const advisorReadTools = (request.tools || (await import('./planner.js')).planningReadTools(request.projectPath)).filter((tool) => tool.name !== 'propose_task' && tool.readOnly !== false);
            const result = await runHarness({ ...request, model: requestedModel, agentPath: member.path, prompt: question, onOutput: undefined, signal, readOnly: true, tools: advisorReadTools, teamBudget: childBudget, timeoutMs: 300_000, maxOutputBytes: 2 * 1024 * 1024 });
            if (result.outcome !== 'success') throw new Error(`Advisor ${member.name} ${result.outcome}: ${result.output}`);
            return result;
        }, request.signal)].map((tool) => ({ ...tool, invoke: async (input: Record<string, unknown>) => {
            if (tool.readOnly === false) budget.externalEffects = true;
            return tool.invoke(input);
        } }));
        if (tools.length && !harness.toolDiscovery) throw new Error(`${harness.name} cannot verify TEAM/read-tool discovery before inference. Select a harness with verified TEAM capability. No model call was made.`);
        if (tools.length) bridge = await createToolBridge(request.projectPath, tools);
        const prompt = [
            'ORCHESTRATION: Implement only the supplied task. Promptbook owns status, task claiming, checks and Git finalization. Do not commit, push, claim other tasks, modify .ptbk bookkeeping or run database migrations. Preserve pre-existing user work. Do not weaken validation to make checks pass.',
            request.readOnly ? 'PERMISSIONS: Read-only consultation. No shell commands, filesystem writes, application patches, Git operations or delegated implementation. Use host-provided tools to read the project. Only the primary planner may propose tasks.' : '',
            agent ? `AGENT INSTRUCTIONS:\n${agent.instructions}` : '',
            request.context ? `PROJECT CONTEXT:\n${request.context}` : '',
            bridge ? `AVAILABLE ADVISORS/TOOLS: ${tools.map((tool) => tool.name).join(', ')}. Consult advisors only when useful; each advisor has its own Book.` : '',
            'ACCEPTANCE: Verify the requested outcome, explain available evidence and unmet requirements. Report only actual actions/checks. Include a JSON line {"acceptance":{"satisfied":true|false,"evidence":"concrete evidence and any limits"}} in your final report.',
            `TASK:\n${request.prompt}`,
        ].filter(Boolean).join('\n\n');
        const invocationInput = { request, prompt, help, bridge, env, authentication };
        const command = await plugin.prepare(invocationInput);
        cleanup = command.cleanup;
        const processResult = await plugin.execute({ ...invocationInput, command, tools });
        const metadata = providerMetadata(processResult.output, tools);
        if (metadata.externalEffects) budget.externalEffects = true;
        if (metadata.usage) for (const [name, value] of Object.entries(metadata.usage)) budget.usage[name] = (budget.usage[name] || 0) + value;
        let outcome = classifyHarnessResult(processResult);
        let output = processResult.output + (processResult.spawnError ? `\n${processResult.spawnError}` : '');
        if (outcome === 'success' && bridge && !bridge.discovered()) {
            outcome = 'configuration';
            output += '\nThe provider did not discover the required ptbk tools. Update the provider CLI or correct its MCP configuration; this turn cannot be reported as successful.';
        }
        if (outcome === 'authentication') output += `\nLogin: ${harness.login}. Authentication failures are not retried automatically.`;
        if (outcome === 'quota' && request.harness === 'openai-codex' && !request.allowCredits && /credit/i.test(output)) output += '\nCredit use is disabled. Explicitly use --allow-credits to authorize credits; API billing still requires PTBK_OPENAI_CODEX_USE_API_KEY=1.';
        return { outcome, exitCode: processResult.exitCode, signal: processResult.signal, output: redacted(output), ...metadata, authentication, ...(harnessVersion ? { harnessVersion } : {}), ...(budget.externalEffects ? { externalEffects: true } : {}), effectiveModel: metadata.effectiveModel || (request.model && request.model !== 'default' ? request.model : harness.nativeDefault ? 'provider-native (not reported)' : harness.defaultModel), ...(!request.teamBudget && Object.keys(budget.usage).length ? { usage: budget.usage } : {}) };
    } catch (error) {
        const output = redacted((error as Error).message);
        return { outcome: request.signal?.aborted ? 'cancelled' : /authentication required/i.test(output) ? 'authentication' : 'configuration', exitCode: null, output, authentication, ...(harnessVersion ? { harnessVersion } : {}), ...(budget.externalEffects ? { externalEffects: true } : {}) };
    } finally { try { await bridge?.close(); await cleanup?.(); } finally { await releaseUsage?.(); } }
}

/** Load project context with explicit input replacing the implicit AGENTS.md. @private */
export async function loadHarnessContext(projectPath: string, context?: string): Promise<string | undefined> {
    if (context !== undefined) {
        if (context === '') return '';
        try { return await readFile(resolve(projectPath, context), 'utf8'); } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`Explicit context does not exist: ${context}`);
            throw error;
        }
    }
    try { return await readFile(resolve(projectPath, 'AGENTS.md'), 'utf8'); } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
    }
}
