import { EXIT, PtbkError } from '../../common/errors.js';
import { CANCELLED, composeText, selectOne } from '../../ui/prompts.js';
import { openChatSource } from '../chats.js';
import { printJson, readStdin, selectedProject } from '../common.js';
import { flag, type CommandContext } from '../context.js';

/**
 * `ptbk answer`: list chats whose agent waits for the user and append one answer (compatibility entry point for
 * former requests; the answer is an ordinary committed chat message).
 *
 * @private command
 */
export default async function answer(context: CommandContext): Promise<number> {
    const { terminal } = context;
    const project = await selectedProject(context);
    // Answers resume waiting work; they do not start a conversation turn in this process.
    const { source, service } = await openChatSource(context, project, { replies: false });
    let [name, ...rest] = context.positionals;
    let value = rest.join(' ');
    if (flag(context, 'stdin')) value = (await readStdin()).replace(/\s+$/, '');
    const waiting = (await source.list()).filter((chat) => chat.status === 'waiting-for-user' && chat.humanFacing);
    if (!name) {
        if (flag(context, 'json')) {
            printJson(waiting);
            return EXIT.success;
        }
        if (!waiting.length) {
            terminal.write('No agent is waiting for you.\n');
            return EXIT.success;
        }
        if (!terminal.interactive) {
            for (const chat of waiting) {
                terminal.write(`${chat.name}\n  ${chat.awaiting?.sender ?? chat.agent ?? 'agent'}: ${(chat.awaiting?.text ?? '').replace(/\n/g, '\n  ')}\n${chat.awaiting?.choices?.length ? `  Choices: ${chat.awaiting.choices.join(' | ')}\n` : ''}${chat.links.length ? `  Links: ${chat.links.join(', ')}\n` : ''}  Answer: ptbk answer "${chat.name}" "<answer>"\n`);
            }
            return EXIT.success;
        }
        terminal.title.set({ project: project.name, mode: 'Answer' });
        const chosen = await selectOne(terminal, {
            frame: { title: 'ptbk answer', step: `${waiting.length} waiting chat(s)` },
            question: 'Which conversation do you want to answer?',
            choices: waiting.map((chat) => ({ value: chat.name, label: chat.name, description: `${chat.awaiting?.sender ?? chat.agent ?? ''}${chat.links.length ? ` · ${chat.links.join(', ')}` : ''}` })),
            defaultValue: waiting[0]!.name,
        });
        if (chosen === CANCELLED) return EXIT.incomplete;
        name = chosen;
    }
    const detail = await source.get(name);
    if (detail.summary.status !== 'waiting-for-user' || !detail.summary.awaiting) {
        throw new PtbkError(`The chat "${detail.summary.name}" does not wait for an answer (${detail.summary.status}).`, { kind: 'conflict', effect: 'Nothing was saved.', next: [`Continue the conversation with \`ptbk chat --open "${detail.summary.name}"\`.`] });
    }
    const { awaiting } = detail.summary;
    if (!value) {
        if (!terminal.interactive) throw new PtbkError('An answer is required.', { kind: 'usage', next: [`Run \`ptbk answer "${detail.summary.name}" "<answer>"\` or use --stdin.`] });
        terminal.title.set({ project: project.name, mode: 'Answer', detail: detail.summary.name });
        terminal.write(`${terminal.style.bold(awaiting.sender)}\n${awaiting.text}\n\n`);
        const response = awaiting.choices?.length
            ? await selectOne(terminal, { frame: { title: 'ptbk answer', step: detail.summary.name }, question: 'Your answer:', choices: awaiting.choices.map((choice) => ({ value: choice, label: choice })) })
            : await composeText(terminal, { frame: { title: 'ptbk answer', step: detail.summary.name }, question: 'Your answer:', required: true });
        if (response === CANCELLED) {
            terminal.write('Not answered; the chat keeps waiting.\n');
            return EXIT.incomplete;
        }
        value = response;
    }
    // A predefined decision accepts only its offered answers here; questions belong in `ptbk chat --open`.
    if (awaiting.choices?.length && !awaiting.choices.includes(value.trim())) {
        throw new PtbkError(`"${value}" is not one of the offered answers.`, { kind: 'usage', reason: `Choose one of: ${awaiting.choices.join(' | ')}`, effect: 'Nothing was saved.', next: [`Ask a clarifying question with \`ptbk chat --open "${detail.summary.name}"\`.`] });
    }
    const sent = await source.send(detail.summary.name, value, detail.messages.length);
    terminal.write(`Answered in {{${sent.name}}}${sent.commit ? ` (${sent.commit.slice(0, 8)})` : ''}.${service ? ' The service continues the affected work.' : ' The affected work continues on the next `ptbk start` or `ptbk run`.'}\n`);
    return EXIT.success;
}
