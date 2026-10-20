import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, readTextIfExists } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import { formatAgentReference, parseReferenceValue } from '../book/references.js';
import { resolveEffectiveAgent, type AgentCatalog } from '../project/agents.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import { EXPERT_DOCUMENTATION_DIRECTORY } from '../project/expert.js';
import type { Project } from '../project/workspace.js';
import { runHarness } from '../harness/run.js';
import { ToolBridge, type BridgeTool } from '../engine/bridge.js';
import { instanceEnvironment, type HarnessPool } from '../engine/harnesses.js';
import { renderAgentInstructions } from '../engine/prompt.js';
import { teamTools } from '../engine/team.js';
import { chatAgent, isHumanFacing } from './chat-book.js';
import type { ChatStore, ChatWrite } from './store.js';
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
    readonly onActivity?: (text: string) => void;
};

/**
 * Outcome of an agent's chat turn.
 *
 * @private chats
 */
export type ChatTurn = { readonly reply?: ChatWrite; readonly error?: string; readonly createdTasks: readonly string[]; readonly learning?: string; readonly consultations?: readonly string[] };

/**
 * Lets the chat's agent answer the user's latest message (read-only; tasks only through `create_task`).
 *
 * Opening or reading a chat never runs this; only a new user message in a human-led chat does.
 *
 * @private chats
 */
export async function replyInChat(context: ConversationContext, chatName: string): Promise<ChatTurn> {
    const stored = await context.chats.find(chatName);
    if (!stored) throw new PtbkError(`No chat named "${chatName}".`, { kind: 'not-found' });
    const { chat } = stored;
    if (!isHumanFacing(chat)) throw new PtbkError('Agent↔agent consultation chats are task records, not conversations with the user.', { kind: 'usage' });
    const agentReference = chatAgent(chat);
    if (!agentReference) throw new PtbkError(`The chat "${chat.name}" has no single agent participant.`, { kind: 'configuration' });
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.senderKey !== 'user') return { createdTasks: [] };
    const agent = await resolveEffectiveAgent(context.catalog, agentReference);
    const errors = agent.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length) return { createdTasks: [], error: `${agentReference} cannot reply: ${errors.map((diagnostic) => diagnostic.message).join(' ')}` };
    const preferred = setting<string | undefined>(context.settings, 'routing.harness');
    const harnessId = [preferred, ...context.pool.usable()].find((id): id is string => Boolean(id) && Boolean(context.pool.plugin(id!)?.capabilities.readOnly) && Boolean(context.pool.select(id!)));
    if (!harnessId) return { createdTasks: [], error: 'No usable harness supports read-only chat replies.' };
    const plugin = context.pool.plugin(harnessId)!;
    const instance = context.pool.select(harnessId)!;
    const inspection = context.pool.inspectionOf(instance.name)!;
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
                          return { text: `Created the task {{${name}}} (linked to this chat). The agenda will execute it.` };
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
                    task: { ref: `{{${chat.name}}}`, title: chat.name },
                    scope: 'conversation',
                    agentName: agent.name,
                    harness: harnessId,
                    depth: 0,
                    budget: { calls: 0 },
                    questionsAllowed: false,
                    signal: controller.signal,
                    onUserChat: () => undefined,
                    onActivity: (text) => context.onActivity?.(`${agent.name} in {{${chat.name}}}: ${text}`),
                },
                { includeUser: false },
            ),
        );
    }
    const prompt = [
        `# Conversation\n\nYou are **${agent.name}**, talking with the user (the project owner) in the persistent chat {{${chat.name}}} of the project at \`${context.project.root}\`.`,
        `## Your role\n\n${renderAgentInstructions(agent) || '_No additional instructions._'}`,
        projectInstructions ? `## Project instructions (${contextFile})\n\n${projectInstructions.slice(0, 16_000)}` : '',
        chat.links.length ? `## Linked Books\n\n${chat.links.join(', ')}` : '',
        `## Conversation so far\n\n${transcript}`,
        [
            '## How to answer',
            '',
            '- Reply to the user\'s latest message directly and helpfully; you may inspect project files and Git history to answer.',
            '- This conversation is read-only: never modify files or run write operations.',
            tools.some((tool) => tool.name === 'create_task') ? '- To start work the user asked for or agreed to, call the `create_task` tool; the agenda executes it later with checks and commits. Do not claim work is done when you only created a task.' : '- You cannot create tasks here; describe what `ptbk add` should contain instead.',
            ...(tools.some((tool) => tool.name === 'consult')
                ? ['- For a specialist question, call the `consult` tool with a teammate from your TEAM (or @Expert for Promptbook itself) and tell the user whose advice you relay. Advice is not executed work: specialist work goes through `create_task`.']
                : []),
            '- If the user corrected you or stated a lasting, project-specific preference relevant to your role, add a final line `PTBK_LEARN <one sentence>` (it is removed from your reply).',
        ].join('\n'),
    ]
        .filter(Boolean)
        .join('\n\n');
    const bridge = tools.length ? await ToolBridge.start(tools) : undefined;
    const directory = await ensureDirectory(context.project.runtime.temporary);
    const promptFile = join(directory, `chat-${shortId()}.md`);
    await writeFile(promptFile, prompt);
    context.onActivity?.(`${agent.name} is replying in {{${chat.name}}}`);
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
                model: instance.model,
            },
            inspection.executablePath ?? plugin.executable,
        );
    } finally {
        await bridge?.close();
        await rm(promptFile, { force: true });
    }
    if (result.outcome !== 'completed' || !result.finalMessage.trim()) return { createdTasks: created, error: result.outcome === 'completed' ? `${agent.name} gave no reply.` : result.diagnostic };
    const learning = LEARN_MARKER.exec(result.finalMessage)?.[1]?.trim();
    const text = result.finalMessage.replace(LEARN_MARKER, '').replace(/^PTBK_RESULT .*$/m, '').trim();
    const reply = await context.chats.append(chat.name, { sender: formatAgentReference(agent.name), text: text || '(no reply text)' }, { trailers: created.length ? { 'Task-Name': created } : undefined });
    if (learning && agent.learning.open && agent.definition && parseReferenceValue(agentReference)?.normalized !== 'teacher' && setting<boolean>(context.settings, 'learning.isEnabled')) {
        await context.scheduleLearning?.({ chat: chat.name, agent: agent.name, note: learning }).catch(() => undefined);
    }
    return { reply, createdTasks: created, learning, consultations };
}
