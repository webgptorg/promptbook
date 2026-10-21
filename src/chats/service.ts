import { PtbkError } from '../common/errors.js';
import { commitmentsOf } from '../book/parse.js';
import { formatAgentReference, normalizeAgentName, toReference } from '../book/references.js';
import type { AgentCatalog } from '../project/agents.js';
import { CHATTER_NAME } from '../project/defaults.js';
import type { ActiveRecord, StateStore } from '../engine/state.js';
import { isHumanFacing } from './chat-book.js';
import type { ChatStore, ChatSummary, ChatWrite } from './store.js';

/**
 * A selectable target agent of a new chat.
 *
 * @private chats
 */
export type ChatAgentChoice = {
    /** Display name. */
    readonly name: string;
    /** Reference to pass when creating the chat (`@Developer`, `{Frontend Developer}`). */
    readonly reference: string;
    /**
     * `chatter` is the default partner of a new chat (offered first, chosen with Enter); `ordinary`, `hidden`
     * (core/hidden agents) and `expert` are the alternatives behind "Choose another agent".
     */
    readonly group: 'chatter' | 'ordinary' | 'hidden' | 'expert';
    /** First goal of the agent, when declared. */
    readonly description?: string;
};

/**
 * One chat with its complete messages, as shown by every client.
 *
 * @private chats
 */
export type ChatDetail = {
    readonly summary: ChatSummary;
    readonly messages: ReadonlyArray<{ readonly sender: string; readonly at: string; readonly text: string; readonly choices?: readonly string[] }>;
};

/**
 * Agents the user may chat with: Chatter first (the default partner of a new chat, when it is a valid agent), then
 * every alternative: visible ordinary agents, hidden/core agents and the engine-provided Expert. User, Void and Null
 * are never offered.
 *
 * @private chats
 */
export function chatAgentChoices(catalog: AgentCatalog): ChatAgentChoice[] {
    const chatterKey = normalizeAgentName(CHATTER_NAME);
    const ordinary = catalog.ordinary().filter((entry) => entry.normalized !== chatterKey);
    const ordinaryKeys = new Set(ordinary.map((agent) => agent.normalized));
    const winners = catalog.index.winners('agent').filter((entry) => entry.kind === 'agent' && entry.tier !== 4);
    const chatter = winners.find((entry) => entry.normalized === chatterKey);
    const hidden = winners.filter((entry) => !ordinaryKeys.has(entry.normalized) && entry.normalized !== chatterKey);
    const choice = (entry: (typeof hidden)[number], group: ChatAgentChoice['group']): ChatAgentChoice => ({
        name: entry.name,
        reference: formatAgentReference(entry.name),
        group,
        description: commitmentsOf(entry.document, 'GOAL')[0]?.value.split('\n')[0]?.slice(0, 100),
    });
    return [
        ...(chatter ? [choice(chatter, 'chatter')] : []),
        ...ordinary.map((entry) => choice(entry, 'ordinary')),
        ...hidden.map((entry) => choice(entry, 'hidden')),
        // The built-in Expert always wins its name, so it is always available.
        { name: 'Expert', reference: '@Expert', group: 'expert', description: 'Engine-provided Promptbook expert (current syntax and capabilities).' },
    ];
}

/**
 * The default partner of a new chat (Chatter), or an actionable diagnostic when it is missing or invalid. Another
 * agent is never substituted silently, and nothing is created or initialized here.
 *
 * @private chats
 */
export function defaultChatAgent(choices: readonly ChatAgentChoice[]): ChatAgentChoice {
    const chatter = choices.find((choice) => choice.group === 'chatter');
    if (chatter) return chatter;
    throw new PtbkError(`${CHATTER_NAME}, the default partner of new chats, is missing or invalid in this project.`, {
        kind: 'setup',
        reason: `No valid \`AGENT ${CHATTER_NAME}\` Book was found (normally agents/.core/chatter.book).`,
        effect: 'No chat was started; no other agent was chosen in its place.',
        next: ['Run `ptbk init` (or `ptbk start`) to add the missing core agent, or fix its Book (`ptbk lint`).', 'Or choose an agent explicitly, e.g. `ptbk chat --agent Developer`.'],
    });
}

/**
 * Reads one chat with its messages.
 *
 * @private chats
 */
export async function chatDetail(store: ChatStore, name: string): Promise<ChatDetail> {
    const stored = await store.find(name);
    if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found', next: ['List chats with `ptbk chat --list`.'] });
    const summary = (await store.summaries()).find((item) => item.path === stored.relativePath)!;
    return { summary, messages: stored.chat.messages.map((message) => ({ sender: message.sender, at: message.at, text: message.text, choices: message.choices })) };
}

/**
 * Starts a new user-led chat with exactly one agent (its first message is committed).
 *
 * @private chats
 */
export async function createUserChat(store: ChatStore, catalog: AgentCatalog, agent: string, text: string, options: { readonly name?: string } = {}): Promise<ChatWrite> {
    const reference = toReference(agent);
    const resolution = await catalog.resolve(reference);
    if (resolution.kind === 'non-agent' && resolution.name !== 'Expert') throw new PtbkError(`You cannot chat with ${resolution.name}; choose a project agent or @Expert.`, { kind: 'usage' });
    if (resolution.kind !== 'agent' && resolution.kind !== 'non-agent') {
        throw new PtbkError(`Cannot chat with ${agent}: ${resolution.kind === 'wrong-kind' ? `${resolution.entry.relativePath} is a ${resolution.entry.kind}, not an agent` : `no such agent (${resolution.kind})`}.`, { kind: 'usage', next: ['Run `ptbk chat` without --agent to choose one.'] });
    }
    const name = resolution.kind === 'agent' ? resolution.definition.name : 'Expert';
    const first = text.split('\n').find((line) => line.trim())?.trim();
    if (!first) throw new PtbkError('The first message of a chat cannot be empty.', { kind: 'usage' });
    return await store.create({
        name: options.name?.trim() || `${name}: ${first.slice(0, 60)}`,
        members: ['@User', formatAgentReference(name)],
        status: 'open',
        messages: [{ sender: '@User', text }],
        taken: catalog.index.names(),
    });
}

/**
 * Appends the user's message to a chat (one commit).
 *
 * In a chat waiting for the user, a reply matching the offered choices (or any reply when none were offered) answers
 * it, reopens the chat and lets the waiting task resume; any other reply is a clarifying question for the agent.
 * A failure-recovery decision accepts only one of its offered choices.
 *
 * @private chats
 */
export async function appendUserMessage(
    store: ChatStore,
    state: StateStore,
    name: string,
    text: string,
    options: { readonly expected?: number } = {},
): Promise<{ readonly written: ChatWrite; readonly waitingTask?: ActiveRecord; readonly answered: boolean; readonly needsReply: boolean }> {
    const stored = await store.find(name);
    if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found', next: ['List chats with `ptbk chat --list`.'] });
    if (!isHumanFacing(stored.chat)) throw new PtbkError('Agent↔agent consultation chats are task records; you cannot write into them.', { kind: 'usage' });
    const waiting = stored.chat.status === 'waiting-for-user';
    const awaited = waiting ? [...stored.chat.messages].reverse().find((message) => message.senderKey !== 'user') : undefined;
    const applicable = !awaited?.choices?.length || awaited.choices.includes(text.trim());
    const active = await state.readActive();
    const records = [...(await state.readParked()), ...(active ? [active] : [])];
    const waitingTask = records.find((record) => record.waitingChat === stored.chat.name || record.recoveryChat === stored.chat.name);
    if (waitingTask?.recoveryChat === stored.chat.name && waiting && !applicable) {
        throw new PtbkError(`"${text}" is not one of the offered answers.`, { kind: 'usage', reason: `Choose one of: ${awaited!.choices!.join(' | ')}`, effect: 'Nothing was saved.' });
    }
    const answered = waiting && applicable;
    const written = await store.append(stored.chat.name, { sender: '@User', text: answered && awaited?.choices?.length ? text.trim() : text }, {
        // Answering reopens the chat; writing into a resolved chat continues the conversation.
        status: answered || stored.chat.status === 'resolved' ? 'open' : undefined,
        expectedMessages: options.expected,
        trailers: waitingTask ? { 'Task-Name': waitingTask.taskTitle } : undefined,
    });
    await store.markRead(written.chat.name);
    return { written, waitingTask, answered, needsReply: !(waitingTask && answered) };
}
