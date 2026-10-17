import { PtbkError } from '../common/errors.js';
import { normalizeAgentName, parseReferenceValue } from '../book/references.js';
import { LocalChats } from '../chats/local.js';
import type { ChatAgentChoice } from '../chats/service.js';
import { loadSettings } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import { lookupService } from '../service/control.js';
import { controlChatSource, type ChatSource } from '../ui/chat-client.js';
import { CANCELLED, selectOne } from '../ui/prompts.js';
import type { TerminalProfile } from '../ui/terminal.js';
import { settingOverrides } from './common.js';
import type { CommandContext } from './context.js';

/**
 * The chat source of a project: the running service when there is one, otherwise the project directly.
 *
 * @private CLI chats
 */
export async function openChatSource(
    context: CommandContext,
    project: Project,
    options: { readonly replies?: boolean; readonly onActivity?: (text: string) => void; readonly onReplyError?: (error: string) => void } = {},
): Promise<{ readonly source: ChatSource; readonly service: boolean; readonly local?: LocalChats }> {
    const lookup = await lookupService(project);
    if (lookup.state === 'unreachable') {
        throw new PtbkError('The recorded ptbk service does not answer, so chats cannot be written safely.', { kind: 'technical', project: project.root, reason: lookup.reason, next: ['Run `ptbk status` to inspect it, or `ptbk restart`.'] });
    }
    if (lookup.state === 'running') return { source: controlChatSource((method, params) => lookup.client.request(method, params ?? {}), 'cli'), service: true };
    const settings = await loadSettings(project, { env: context.env, cli: settingOverrides(context) });
    const local = await LocalChats.open(project, settings, context.env);
    return { source: local.source({ replies: options.replies ?? true, onActivity: options.onActivity, onReplyError: options.onReplyError }), service: false, local };
}

/**
 * Lets the user choose the agent of a new chat: visible ordinary agents first, hidden/core agents and Expert under More.
 *
 * @private CLI chats
 */
export async function pickChatAgent(terminal: TerminalProfile, agents: readonly ChatAgentChoice[]): Promise<ChatAgentChoice | typeof CANCELLED> {
    const ordinary = agents.filter((agent) => agent.group === 'ordinary');
    const more = agents.filter((agent) => agent.group !== 'ordinary');
    const MORE = '\u0000more';
    const first = await selectOne<string>(terminal, {
        frame: { title: 'ptbk chat', step: 'Choose the agent' },
        question: 'Who do you want to talk to?',
        choices: [...ordinary.map((agent) => ({ value: agent.reference, label: agent.name, description: agent.description })), ...(more.length ? [{ value: MORE, label: 'More…', description: 'hidden and core agents, Expert' }] : [])],
        defaultValue: ordinary[0]?.reference ?? MORE,
    });
    if (first === CANCELLED) return CANCELLED;
    if (first !== MORE) return agents.find((agent) => agent.reference === first)!;
    const second = await selectOne<string>(terminal, {
        frame: { title: 'ptbk chat', step: 'More agents' },
        question: 'Hidden/core agents and the engine-provided Expert:',
        choices: more.map((agent) => ({ value: agent.reference, label: agent.name, description: `${agent.group === 'expert' ? 'engine-provided' : 'hidden/core'}${agent.description ? ` · ${agent.description}` : ''}` })),
        defaultValue: more[0]!.reference,
    });
    return second === CANCELLED ? CANCELLED : agents.find((agent) => agent.reference === second)!;
}

/**
 * Finds the agent choice for an explicit `--agent` value (`Developer`, `@Developer`, `{Frontend Developer}`).
 *
 * @private CLI chats
 */
export function explicitChatAgent(agents: readonly ChatAgentChoice[], value: string): ChatAgentChoice {
    const key = parseReferenceValue(value.startsWith('@') || value.startsWith('{') ? value : `{${value}}`)?.normalized ?? normalizeAgentName(value);
    const found = agents.find((agent) => normalizeAgentName(agent.name) === key);
    if (found) return found;
    if (['user', 'void', 'null'].includes(key)) throw new PtbkError(`You cannot chat with @${value.replace(/^@/, '')}; choose a project agent or @Expert.`, { kind: 'usage' });
    throw new PtbkError(`No agent named ${value} is available for chats.`, { kind: 'usage', next: [`Choose one of: ${agents.map((agent) => agent.reference).join(', ')}.`] });
}

/**
 * Waits until the chat has a message after `after` messages from someone other than the user (or the timeout).
 *
 * @private CLI chats
 */
export async function waitForReply(source: ChatSource, name: string, after: number, timeoutMs: number, failed: () => string | undefined): Promise<{ sender: string; text: string } | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const detail = await source.get(name);
        const reply = detail.messages.slice(after).find((message) => message.sender.replace(/^@/, '').toLowerCase() !== 'user');
        if (reply) return reply;
        if (failed()) return undefined;
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return undefined;
}
