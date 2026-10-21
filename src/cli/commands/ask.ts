import { EXIT, PtbkError } from '../../common/errors.js';
import { loadSettings, setting } from '../../project/config.js';
import { explicitChatAgent, openChatSource, waitForReply } from '../chats.js';
import { readStdin, selectedProject, settingOverrides } from '../common.js';
import { option, flag, type CommandContext } from '../context.js';

/**
 * Longest wait for the agent's answer.
 */
const ANSWER_WAIT_MS = 10 * 60_000;

/**
 * `ptbk ask`: a quick question to one agent, as an ordinary persistent chat (no separate request model).
 *
 * @private command
 */
export default async function ask(context: CommandContext): Promise<number> {
    const { terminal } = context;
    const project = await selectedProject(context);
    let question = context.positionals.join(' ');
    if (flag(context, 'stdin')) question = (await readStdin()).replace(/\s+$/, '');
    if (!question.trim()) throw new PtbkError('A question is required.', { kind: 'usage', next: ['Run `ptbk ask "What is the state of the CSV export?"`.'] });
    const settings = await loadSettings(project, { env: context.env, cli: settingOverrides(context) });
    let replyError: string | undefined;
    const { source } = await openChatSource(context, project, { onReplyError: (error) => (replyError = error) });
    const agent = explicitChatAgent(await source.agents(), option<string>(context, 'agent') ?? setting<string>(settings, 'routing.defaultAgent'));
    const created = await source.create(agent.reference, question, option<string>(context, 'title'));
    terminal.write(terminal.style.muted(`Asked ${agent.reference} in the chat {${created.name}}${created.commit ? ` (${created.commit.slice(0, 8)})` : ''}; waiting for the answer…\n`));
    const reply = await waitForReply(source, created.name, 1, ANSWER_WAIT_MS, () => replyError);
    if (!reply) {
        terminal.write(`No answer yet${replyError ? `: ${replyError}` : ''}. The chat stays saved; continue with \`ptbk chat --open "${created.name}"\`.\n`);
        return EXIT.incomplete;
    }
    terminal.write(`\n${reply.text}\n\n${terminal.style.muted(`— ${reply.sender} · continue with \`ptbk chat --open "${created.name}"\``)}\n`);
    return EXIT.success;
}
