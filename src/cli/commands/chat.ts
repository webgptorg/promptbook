import { EXIT, PtbkError } from '../../common/errors.js';
import { renderChatList, runChatClient } from '../../ui/chat-client.js';
import { CANCELLED } from '../../ui/prompts.js';
import { explicitChatAgent, openChatSource, pickChatAgent, waitForReply } from '../chats.js';
import { printJson, readStdin, selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * Longest wait for the agent's reply in noninteractive use.
 */
const REPLY_WAIT_MS = 10 * 60_000;

/**
 * `ptbk chat`: directly open a new persistent conversation with one agent, reopen a named one, or list chats.
 *
 * No dashboard is required; Ctrl+C closes only this client (the service and the conversation stay).
 *
 * @private command
 */
export default async function chat(context: CommandContext): Promise<number> {
    const { terminal } = context;
    const project = await selectedProject(context);
    let replyError: string | undefined;
    const { source, service, local } = await openChatSource(context, project, { onReplyError: (error) => (replyError = error) });
    if (flag(context, 'list')) {
        const chats = await source.list();
        if (flag(context, 'json')) printJson(chats);
        else terminal.write(renderChatList(chats));
        return EXIT.success;
    }
    let message = context.positionals.join(' ');
    if (flag(context, 'stdin')) message = (await readStdin()).replace(/\s+$/, '');
    const open = option<string>(context, 'open');
    if (open !== undefined) {
        const detail = await source.get(open);
        if (terminal.interactive && !message && flag(context, 'json') !== true) {
            await runChatClient(terminal, source, { kind: 'existing', name: detail.summary.name });
            if (!service && local?.pendingReplies) terminal.write(terminal.style.muted('Chat closed; saving the reply in progress before exiting (Ctrl+C abandons it, the service replies later).\n'));
            return EXIT.success;
        }
        if (message) {
            const sent = await source.send(detail.summary.name, message, detail.messages.length);
            terminal.write(`Sent to {${sent.name}}${sent.commit ? ` (${sent.commit.slice(0, 8)})` : ''}.\n`);
            return EXIT.success;
        }
        await source.read(detail.summary.name);
        if (flag(context, 'json')) printJson(detail);
        else terminal.write(`${detail.summary.name} (${detail.summary.status})\n${detail.messages.map((item) => `\n${item.sender} ${item.at}\n${item.text}${item.choices?.length ? `\n» ${item.choices.join('\n» ')}` : ''}`).join('\n')}\n`);
        return EXIT.success;
    }
    const agents = await source.agents();
    const agentOption = option<string>(context, 'agent');
    let agent;
    if (agentOption) agent = explicitChatAgent(agents, agentOption);
    else if (terminal.interactive) {
        const picked = await pickChatAgent(terminal, agents);
        if (picked === CANCELLED) {
            terminal.write('No chat was started.\n');
            return EXIT.incomplete;
        }
        agent = picked;
    } else throw new PtbkError('Choose the agent of the new chat with --agent.', { kind: 'usage', next: ['Run `ptbk chat --agent Developer "your message"`.'] });
    const title = option<string>(context, 'title');
    if (terminal.interactive && !message) {
        await runChatClient(terminal, source, { kind: 'new', agent, title });
        if (!service && local?.pendingReplies) terminal.write(terminal.style.muted('Chat closed; saving the reply in progress before exiting (Ctrl+C abandons it, the service replies later).\n'));
        return EXIT.success;
    }
    if (!message) throw new PtbkError('The first message is required without an interactive terminal.', { kind: 'usage', next: ['Pass it as an argument or use --stdin.'] });
    const created = await source.create(agent.reference, message, title);
    terminal.write(`Started the chat {${created.name}}${created.commit ? ` (${created.commit.slice(0, 8)})` : ''}.\n`);
    const reply = await waitForReply(source, created.name, 1, REPLY_WAIT_MS, () => replyError);
    if (reply) terminal.write(`\n${reply.sender}:\n${reply.text}\n`);
    else terminal.write(`No reply yet${replyError ? `: ${replyError}` : ''}. Continue with \`ptbk chat --open "${created.name}"\`.\n`);
    return EXIT.success;
}
