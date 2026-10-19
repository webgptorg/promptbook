import { PtbkError } from '../common/errors.js';
import { normalizeAgentName, parseReferenceValue } from '../book/references.js';
import { LocalChats } from '../chats/local.js';
import { defaultChatAgent, type ChatAgentChoice } from '../chats/service.js';
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
 * Lets the user choose the agent of a new chat: exactly two choices first — **Chat with Chatter** (focused default,
 * Enter) and **Choose another agent**, which opens every valid alternative (ordinary, hidden/core agents and Expert).
 *
 * A missing or invalid Chatter is reported with its repair action; only an explicit choice selects another agent.
 *
 * @private CLI chats
 */
export async function pickChatAgent(terminal: TerminalProfile, agents: readonly ChatAgentChoice[]): Promise<ChatAgentChoice | typeof CANCELLED> {
    const chatter = agents.find((agent) => agent.group === 'chatter');
    const others = agents.filter((agent) => agent.group !== 'chatter');
    const OTHER = '\u0000other';
    if (!chatter) {
        try {
            defaultChatAgent(agents);
        } catch (error) {
            const details = (error as { details?: { next?: string[] } }).details;
            terminal.write(`${terminal.style.warning((error as Error).message)}\n${(details?.next ?? []).map((line) => terminal.style.muted(`  → ${line}`)).join('\n')}\n\n`);
        }
    }
    for (;;) {
        if (chatter) {
            const first = await selectOne<string>(terminal, {
                frame: { title: 'ptbk chat', step: 'New chat' },
                question: 'Who do you want to talk to?',
                choices: [
                    { value: chatter.reference, label: `Chat with ${chatter.name}`, description: 'default project guide; consults specialists for you' },
                    { value: OTHER, label: 'Choose another agent', description: 'project agents, hidden/core agents and Expert' },
                ],
                defaultValue: chatter.reference,
            });
            if (first === CANCELLED) return CANCELLED;
            if (first === chatter.reference) return chatter;
        }
        const second = await selectOne<string>(terminal, {
            frame: { title: 'ptbk chat', step: 'Choose another agent' },
            question: chatter ? 'Every agent you can talk to (Esc goes back):' : 'Every agent you can talk to:',
            choices: others.map((agent) => ({ value: agent.reference, label: agent.name, description: `${agent.group === 'expert' ? 'engine-provided' : agent.group === 'hidden' ? 'hidden/core' : 'project agent'}${agent.description ? ` · ${agent.description}` : ''}` })),
            defaultValue: others[0]!.reference,
        });
        if (second !== CANCELLED) return others.find((agent) => agent.reference === second)!;
        // Esc in the full list returns to the two-choice entry; without Chatter it cancels.
        if (!chatter) return CANCELLED;
    }
}

/**
 * Finds the agent choice for an explicit `--agent` value (`Developer`, `@Developer`, `{Frontend Developer}`).
 *
 * @private CLI chats
 */
export function explicitChatAgent(agents: readonly ChatAgentChoice[], value: string): ChatAgentChoice {
    const key = parseReferenceValue(value.startsWith('@') || value.startsWith('{') ? value : `{{${value}}}`)?.normalized ?? normalizeAgentName(value);
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
