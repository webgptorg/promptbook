import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, readTextIfExists } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import { describeModel, determinedRow, formatModelRow, intersectModels, isImpossible, type ModelRow } from '../book/model.js';
import { formatAgentReference, normalizeAgentName, parseReferenceValue } from '../book/references.js';
import { resolveEffectiveAgent, type AgentCatalog, type EffectiveAgent } from '../project/agents.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import { EXPERT_DOCUMENTATION_DIRECTORY } from '../project/expert.js';
import type { Project } from '../project/workspace.js';
import { runHarness } from '../harness/run.js';
import { ToolBridge, type BridgeTool } from '../engine/bridge.js';
import { instanceEnvironment, type HarnessPool } from '../engine/harnesses.js';
import { renderAgentInstructions } from '../engine/prompt.js';
import { chatRoutingPrompt, routerAgent, validateAssignment } from '../engine/generated.js';
import { parseAgentReport } from '../engine/result.js';
import { hasThinking, readOnlyRoute, routeConcrete, type RouteResolution, type RoutingContext } from '../engine/routing.js';
import type { RoutingSelection } from '../engine/state.js';
import { harnessPlugin } from '../harness/registry.js';
import { harnessPluginId, harnessVariantOf } from '../tools/model.js';
import { teamTools } from '../engine/team.js';
import { chatAgent, chatAgents, isHumanFacing } from './chat-book.js';
import type { ChatStore, ChatWrite, StoredChat } from './store.js';
import { conversationChats } from './task-chats.js';

/**
 * Time limit of one chat reply.
 */
const REPLY_TIMEOUT_MS = 10 * 60_000;

/**
 * Most transcript characters given to the agent (older messages are summarized by omission, visibly).
 */
const MAX_TRANSCRIPT_CHARACTERS = 60_000;

/**
 * Marker of a learning note at the end of an agent's chat reply.
 */
const LEARN_MARKER = /^PTBK_LEARN\s+(.+)$/m;

/**
 * Marker of a new presentation title for the chat (appended as `CHAT TITLE`; the declared name never changes).
 */
const TITLE_MARKER = /^PTBK_TITLE\s+(.+)$/m;

/**
 * Services a chat turn needs from its host (service or CLI).
 *
 * @private chats
 */
export type ConversationContext = {
    readonly project: Project;
    readonly settings: EffectiveSettings;
    readonly catalog: AgentCatalog;
    readonly pool: HarnessPool;
    readonly chats: ChatStore;
    readonly env: NodeJS.ProcessEnv;
    readonly signal?: AbortSignal;
    /** Creates and commits an ordinary task through normal authoring (linked to the chat); returns its name. */
    readonly createTask: (input: { readonly title: string; readonly description: string; readonly agent?: string; readonly priority?: number; readonly chat: string }) => Promise<string>;
    /** Schedules an ordinary Teacher task from a chat correction (deduplicated by the host). */
    readonly scheduleLearning?: (input: { readonly chat: string; readonly agent: string; readonly note: string }) => Promise<string | undefined>;
    /** The established execution of a task whose agent asked in this chat (its question needs no new routing). */
    readonly establishedExecution?: (chat: string) => Promise<RoutingSelection | undefined>;
    readonly onActivity?: (text: string) => void;
};

/**
 * Time limit of Router's conversation-scoped routing turn.
 */
const ROUTING_TIMEOUT_MS = 5 * 60_000;

/**
 * Routable outcome of chat routing.
 */
type RoutableChat = Extract<RouteResolution, { kind: 'routable' }>;

/**
 * Resolves the conversation's execution before the agent's reply. A recorded or fully determined MODEL is reused
 * without Router; otherwise Router chooses once, through a bounded read-only consultation (never a queued background
 * task, so it also works while another task runs or scheduling is paused). A human-led chat records the effective
 * MODEL right after the User message that caused it, as its own commit; an agent's question from an executing task
 * keeps that task's established execution.
 */
async function chatExecution(context: ConversationContext, stored: StoredChat, agent: EffectiveAgent): Promise<{ readonly route: RoutableChat } | { readonly error: string }> {
    const { chat } = stored;
    const routing: RoutingContext = { catalog: context.catalog, pool: context.pool, settings: context.settings };
    // A conversation is read-only: only read-only-capable harnesses can serve it.
    const readOnlyVariants = context.pool
        .enabled()
        .filter((id) => harnessPlugin(id)?.capabilities.readOnly)
        .map((id) => harnessPlugin(id)!.variant);
    if (!readOnlyVariants.length) return { error: 'No enabled harness supports read-only chat replies.' };
    const constraint = intersectModels(intersectModels(agent.model, chat.model), { rows: readOnlyVariants.map((harness) => ({ harness })), explicit: true });
    if (isImpossible(constraint)) return { error: `${agent.name}'s MODEL (${describeModel(agent.model)}) and the chat's MODEL (${describeModel(chat.model)}) leave no read-only-capable combination.` };
    const humanLed = chat.messages[0]?.senderKey === 'user';
    if (!humanLed) {
        const established = await context.establishedExecution?.(chat.name);
        const variant = established ? harnessVariantOf(established.harness) : undefined;
        if (established && variant && readOnlyVariants.includes(variant) && established.model) {
            const route = await routeConcrete(agent, { harness: variant, model: established.model, ...(established.thinkingLevel ? { thinking: established.thinkingLevel } : {}), runtime: established.runtime ?? 'official' }, routing);
            if (route.kind === 'routable') return { route };
        }
        const route = await readOnlyRoute(agent, established?.harness, routing, chat.model);
        return route.kind === 'routable' ? { route } : { error: route.reason };
    }
    const determined = determinedRow(constraint, hasThinking);
    let row: ModelRow | undefined = determined;
    let by: string | undefined;
    if (!row) {
        const decided = await routeWithRouter(context, stored, agent, readOnlyVariants);
        if ('error' in decided) return decided;
        row = decided.row;
        by = decided.by;
    }
    const route = await routeConcrete(agent, row, routing);
    if (route.kind !== 'routable') return { error: route.reason };
    if (!chat.model.explicit || formatModelRow(chat.model.rows[0] ?? {}) !== formatModelRow(row)) {
        const recorded = await context.chats.recordModel(chat.name, row, { by });
        context.onActivity?.(`Recorded MODEL ${formatModelRow(row)} in {${chat.name}}${by ? ` (chosen by ${by})` : ''}${recorded.commit ? ` (${recorded.commit.slice(0, 8)})` : ''}`);
    }
    return { route };
}

/**
 * The execution of a joined participant answering in a chat: the established execution of its task when it asked from
 * one, otherwise its own MODEL on a read-only-capable harness. The chat's MODEL (the main agent's) is not imposed and
 * nothing is recorded in the chat.
 */
async function participantExecution(context: ConversationContext, stored: StoredChat, agent: EffectiveAgent): Promise<{ readonly route: RoutableChat } | { readonly error: string }> {
    const routing: RoutingContext = { catalog: context.catalog, pool: context.pool, settings: context.settings };
    const established = await context.establishedExecution?.(stored.chat.name);
    const variant = established ? harnessVariantOf(established.harness) : undefined;
    if (established && variant && established.model && normalizeAgentName(established.agent) === normalizeAgentName(agent.name)) {
        const route = await routeConcrete(agent, { harness: variant, model: established.model, ...(established.thinkingLevel ? { thinking: established.thinkingLevel } : {}), runtime: established.runtime ?? 'official' }, routing);
        if (route.kind === 'routable') return { route };
    }
    const route = await readOnlyRoute(agent, established?.harness, routing);
    return route.kind === 'routable' ? { route } : { error: route.reason };
}

/**
 * Asks Router (with its own concrete MODEL) to choose a chat's execution: one bounded read-only turn, validated like
 * task assignment.
 */
async function routeWithRouter(context: ConversationContext, stored: StoredChat, agent: EffectiveAgent, readOnlyVariants: readonly ReturnType<typeof harnessVariantOf>[]): Promise<{ readonly row: ModelRow; readonly by: string } | { readonly error: string }> {
    const routing: RoutingContext = { catalog: context.catalog, pool: context.pool, settings: context.settings };
    const router = await routerAgent(context.catalog);
    if (!router) return { error: 'Router (agents/.core/router.book) is missing, so the chat cannot be routed.' };
    const routerAgentDefinition = await resolveEffectiveAgent(context.catalog, formatAgentReference(router.name));
    const routerRow = determinedRow(routerAgentDefinition.model, hasThinking);
    if (!routerRow) return { error: `${router.name} has no concrete MODEL, so it cannot route without routing itself (a setup problem Fixer repairs).` };
    const routerRoute = await routeConcrete(routerAgentDefinition, routerRow, routing);
    if (routerRoute.kind !== 'routable') return { error: `${router.name} cannot run: ${routerRoute.reason}` };
    const target = { routing: { agent: formatAgentReference(agent.name), model: stored.chat.model, runners: [] }, priority: { value: 0, resolved: true } };
    const prompt = [
        `# Routing\n\nYou are **${routerAgentDefinition.name}**, choosing how the agent of a conversation of the project at \`${context.project.root}\` replies.`,
        `## Your role\n\n${renderAgentInstructions(routerAgentDefinition) || '_No additional instructions._'}`,
        await chatRoutingPrompt({ chat: stored.chat.name, target, context: routing, readOnlyVariants: readOnlyVariants.filter((variant): variant is NonNullable<typeof variant> => Boolean(variant)) }),
    ].join('\n\n');
    const directory = await ensureDirectory(context.project.runtime.temporary);
    const promptFile = join(directory, `chat-routing-${shortId()}.md`);
    await writeFile(promptFile, prompt);
    context.onActivity?.(`${routerAgentDefinition.name} is routing {${stored.chat.name}}`);
    const instance = context.pool.instance(routerRoute.selection.tool!)!;
    let result;
    try {
        result = await runHarness(
            routerRoute.plugin,
            {
                projectRoot: context.project.root,
                cwd: context.project.root,
                prompt,
                promptFile,
                readOnly: true,
                env: instanceEnvironment(routerRoute.plugin, instance, context.pool.credential(instance), context.env),
                timeoutMs: ROUTING_TIMEOUT_MS,
                signal: context.signal,
                allowCredits: setting<boolean>(context.settings, 'execution.isCreditFallbackAllowed'),
                authentication: routerRoute.inspection.authentication,
                readableDirectories: [],
                model: routerRoute.selection.model,
                thinkingLevel: routerRoute.selection.thinkingLevel,
                baseUrl: routerRoute.selection.baseUrl,
            },
            routerRoute.inspection.executablePath ?? routerRoute.plugin.executable,
        );
    } finally {
        await rm(promptFile, { force: true });
    }
    if (result.outcome !== 'completed') return { error: `${routerAgentDefinition.name} could not route the chat: ${result.diagnostic}` };
    const report = parseAgentReport(result.messages);
    if (!report || report.status !== 'done') return { error: `${routerAgentDefinition.name} gave no usable routing${report?.reason ? `: ${report.reason}` : ''}.` };
    const validation = await validateAssignment(report.data, { target, context: routing });
    if (!validation.ok) return { error: `${routerAgentDefinition.name}'s routing was not usable: ${validation.feedback}` };
    if (validation.decision.kind === 'impossible') return { error: `No compatible execution exists for this chat: ${validation.decision.reason}` };
    const variant = validation.decision.model.harness;
    if (!variant || !readOnlyVariants.includes(variant)) return { error: `${routerAgentDefinition.name} chose ${harnessPlugin(harnessPluginId(variant ?? 'OPENAI_CODEX'))?.displayName ?? 'a harness'} without read-only support.` };
    return { row: validation.decision.model, by: routerAgentDefinition.name };
}

/**
 * Outcome of an agent's chat turn.
 *
 * @private chats
 */
export type ChatTurn = {
    readonly reply?: ChatWrite;
    readonly error?: string;
    readonly createdTasks: readonly string[];
    readonly learning?: string;
    readonly consultations?: readonly string[];
    /** Messages the agent saw (later user messages arrived during the turn and get a follow-up turn). */
    readonly seen?: number;
};

/**
 * Lets the chat's agent answer the user's latest message (read-only; tasks only through `create_task`).
 *
 * Opening or reading a chat never runs this; only a new user message in a human-led chat does.
 *
 * @private chats
 */
export async function replyInChat(context: ConversationContext, chatName: string, options: { readonly followUp?: boolean; readonly agent?: string } = {}): Promise<ChatTurn> {
    const stored = await context.chats.find(chatName);
    if (!stored) throw new PtbkError(`No chat named "${chatName}".`, { kind: 'not-found' });
    const { chat } = stored;
    if (!isHumanFacing(chat)) throw new PtbkError('Agent↔agent consultation chats are task records, not conversations with the user.', { kind: 'usage' });
    // The main agent answers unless the user addressed another participant explicitly.
    const mainReference = chatAgent(chat);
    if (!mainReference) throw new PtbkError(`The chat "${chat.name}" has no agent participant.`, { kind: 'configuration' });
    const addressed = options.agent ? chatAgents(chat).find((member) => parseReferenceValue(member)?.normalized === parseReferenceValue(options.agent!)?.normalized) : undefined;
    const agentReference = addressed ?? mainReference;
    const isMain = agentReference === mainReference;
    const last = chat.messages[chat.messages.length - 1];
    // A follow-up turn answers user messages that arrived while the previous reply was being written.
    if (!last || (last.senderKey !== 'user' && !options.followUp)) return { createdTasks: [] };
    const agent = await resolveEffectiveAgent(context.catalog, agentReference);
    const errors = agent.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length) return { createdTasks: [], error: `${agentReference} cannot reply: ${errors.map((diagnostic) => diagnostic.message).join(' ')}` };
    // A joined agent keeps its own (task) execution context rather than the main speaker's resolved MODEL.
    const execution = isMain ? await chatExecution(context, stored, agent) : await participantExecution(context, stored, agent);
    if ('error' in execution) return { createdTasks: [], error: execution.error };
    const { route } = execution;
    const harnessId = route.selection.harness;
    const plugin = route.plugin;
    const instance = context.pool.instance(route.selection.tool!)!;
    const inspection = route.inspection;
    const contextFile = setting<string | null>(context.settings, 'paths.context');
    const projectInstructions = contextFile ? await readTextIfExists(join(context.project.root, contextFile)) : undefined;
    let transcript = chat.messages.map((message) => `**${message.sender}** (${message.at}):\n${message.text}${message.choices?.length ? `\n(offered choices: ${message.choices.join(' | ')})` : ''}`).join('\n\n');
    if (transcript.length > MAX_TRANSCRIPT_CHARACTERS) transcript = `[… earlier messages omitted; read ${stored.relativePath} for the full chat]\n\n${transcript.slice(-MAX_TRANSCRIPT_CHARACTERS)}`;
    const created: string[] = [];
    const tools: BridgeTool[] = plugin.capabilities.mcp
        ? [
              {
                  name: 'create_task',
                  description: 'Create an ordinary task for the agenda (saved and committed; executed later with checks). Only for work the user asked for or clearly agreed to.',
                  inputSchema: {
                      type: 'object',
                      properties: {
                          title: { type: 'string', description: 'Readable, distinct task name' },
                          description: { type: 'string', description: 'Intended result and constraints' },
                          agent: { type: 'string', description: 'Optional responsible agent, e.g. @Developer' },
                          priority: { type: 'number' },
                      },
                      required: ['title', 'description'],
                  },
                  handler: async (input) => {
                      try {
                          const name = await context.createTask({
                              title: String(input.title ?? '').trim(),
                              description: String(input.description ?? '').trim(),
                              agent: typeof input.agent === 'string' && input.agent.trim() ? input.agent.trim() : undefined,
                              priority: typeof input.priority === 'number' && input.priority >= 0 ? input.priority : undefined,
                              chat: chat.name,
                          });
                          created.push(name);
                          return { text: `Created the task {${name}} (linked to this chat). The agenda will execute it.` };
                      } catch (error) {
                          return { text: `The task was not created: ${errorMessage(error)}`, isError: true };
                      }
                  },
              },
          ]
        : [];
    // Conversation-scoped TEAM consultation: bounded read-only advice, recorded as linked two-agent chats with their own
    // scoped commits; the chat's agent stays the user's speaker and specialists never join the human chat.
    const consultations: string[] = [];
    if (plugin.capabilities.mcp && agent.team.length) {
        const recorder = conversationChats(context.chats, chat.name, { takenNames: () => context.catalog.index.names() });
        const controller = new AbortController();
        context.signal?.addEventListener('abort', () => controller.abort(), { once: true });
        tools.push(
            ...teamTools(
                {
                    project: context.project,
                    catalog: context.catalog,
                    pool: context.pool,
                    settings: context.settings,
                    chats: {
                        askUser: recorder.askUser,
                        recordConsultation: async (input) => {
                            const name = await recorder.recordConsultation(input);
                            if (name) consultations.push(name);
                            return name;
                        },
                    },
                    task: { ref: `{${chat.name}}`, title: chat.name },
                    scope: 'conversation',
                    agentName: agent.name,
                    harness: harnessId,
                    depth: 0,
                    budget: { calls: 0 },
                    questionsAllowed: false,
                    signal: controller.signal,
                    onUserChat: () => undefined,
                    onActivity: (text) => context.onActivity?.(`${agent.name} in {${chat.name}}: ${text}`),
                },
                { includeUser: false },
            ),
        );
    }
    const prompt = [
        `# Conversation\n\nYou are **${agent.name}**, talking with the user (the project owner) in the persistent chat {${chat.name}} of the project at \`${context.project.root}\`.${isMain ? '' : ` The user addressed you directly; ${mainReference} is the chat's main agent and stays so.`}`,
        `## Your role\n\n${renderAgentInstructions(agent) || '_No additional instructions._'}`,
        projectInstructions ? `## Project instructions (${contextFile})\n\n${projectInstructions.slice(0, 16_000)}` : '',
        chat.links.length ? `## Linked Books\n\n${chat.links.join(', ')}` : '',
        `## Conversation so far\n\n${transcript}`,
        [
            '## How to answer',
            '',
            '- Reply to the user\'s latest message(s) you have not answered yet, directly and helpfully; you may inspect project files and Git history to answer.',
            '- This conversation is read-only: never modify files or run write operations.',
            tools.some((tool) => tool.name === 'create_task')
                ? '- This chat coordinates work; tasks execute it. For substantial work the user asked for or agreed to (implementing a feature, preparing or submitting a document, anything beyond a quick read-only look), call the `create_task` tool promptly instead of doing or simulating the work here, and do not wait for it: the agenda executes it later with checks and commits, its live status card and its result appear in this chat, and its agent may ask questions here. Do not claim work is done when you only created a task.'
                : '- You cannot create tasks here; describe what `ptbk add` should contain instead.',
            ...(tools.some((tool) => tool.name === 'consult')
                ? ['- For a specialist question, call the `consult` tool with a teammate from your TEAM (or @Expert for Promptbook itself) and tell the user whose advice you relay. Advice is not executed work: specialist work goes through `create_task`.']
                : []),
            '- If the user corrected you or stated a lasting, project-specific preference relevant to your role, add a final line `PTBK_LEARN <one sentence>` (it is removed from your reply).',
            `- When the topic of this chat becomes clear or changes, add a final line \`PTBK_TITLE <short topic title>\`${chat.title ? ` (currently "${chat.title}")` : ''}: it updates the title shown to the user and is removed from your reply. The chat's name {${chat.name}} never changes.`,
        ].join('\n'),
    ]
        .filter(Boolean)
        .join('\n\n');
    const bridge = tools.length ? await ToolBridge.start(tools) : undefined;
    const directory = await ensureDirectory(context.project.runtime.temporary);
    const promptFile = join(directory, `chat-${shortId()}.md`);
    await writeFile(promptFile, prompt);
    context.onActivity?.(`${agent.name} is replying in {${chat.name}}`);
    let result;
    try {
        result = await runHarness(
            plugin,
            {
                projectRoot: context.project.root,
                cwd: context.project.root,
                prompt,
                promptFile,
                readOnly: true,
                mcp: bridge?.launch(),
                env: instanceEnvironment(plugin, instance, context.pool.credential(instance), context.env),
                timeoutMs: REPLY_TIMEOUT_MS,
                signal: context.signal,
                allowCredits: setting<boolean>(context.settings, 'execution.isCreditFallbackAllowed'),
                authentication: inspection.authentication,
                readableDirectories: agent.name === 'Expert' || agent.chain.includes('Expert') ? [EXPERT_DOCUMENTATION_DIRECTORY] : [],
                model: route.selection.model,
                thinkingLevel: route.selection.thinkingLevel,
                baseUrl: route.selection.baseUrl,
            },
            inspection.executablePath ?? plugin.executable,
        );
    } finally {
        await bridge?.close();
        await rm(promptFile, { force: true });
    }
    if (result.outcome !== 'completed' || !result.finalMessage.trim()) return { createdTasks: created, error: result.outcome === 'completed' ? `${agent.name} gave no reply.` : result.diagnostic };
    const learning = LEARN_MARKER.exec(result.finalMessage)?.[1]?.trim();
    const title = TITLE_MARKER.exec(result.finalMessage)?.[1]?.trim();
    const text = result.finalMessage.replace(LEARN_MARKER, '').replace(TITLE_MARKER, '').replace(/^PTBK_RESULT .*$/m, '').trim();
    let reply = await context.chats.append(chat.name, { sender: formatAgentReference(agent.name), text: text || '(no reply text)' }, { trailers: created.length ? { 'Task-Name': created } : undefined });
    if (title) reply = await context.chats.annotate(chat.name, { title }).catch(() => reply);
    if (learning && agent.learning.open && agent.definition && parseReferenceValue(agentReference)?.normalized !== 'teacher' && setting<boolean>(context.settings, 'learning.isEnabled')) {
        await context.scheduleLearning?.({ chat: chat.name, agent: agent.name, note: learning }).catch(() => undefined);
    }
    return { reply, createdTasks: created, learning, consultations, seen: chat.messages.length };
}
