import { EXIT, PtbkError } from '../../common/errors.js';
import { RequestStore, type UserRequest } from '../../engine/requests.js';
import { lookupService } from '../../service/control.js';
import { CANCELLED, composeText, selectOne } from '../../ui/prompts.js';
import { printJson, readStdin, selectedProject } from '../common.js';
import { flag, type CommandContext } from '../context.js';

/**
 * `ptbk answer`: list pending requests and answer one exactly once (works without HTTP or a running service).
 *
 * @private command
 */
export default async function answer(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const store = new RequestStore(project.runtime.requests);
    const lookup = await lookupService(project);
    const apply = async (id: string, value: string, status: 'answered' | 'rejected'): Promise<UserRequest> => {
        if (lookup.state === 'running') return await lookup.client.request<UserRequest>('answer', { id, answer: value, status, via: 'cli' });
        return await store.resolve(id, { status, answer: value, via: 'cli' });
    };
    const { terminal } = context;
    let [id, ...rest] = context.positionals;
    let value = rest.join(' ');
    if (flag(context, 'stdin')) value = (await readStdin()).replace(/\s+$/, '');
    const pending = await store.list({ status: 'pending' });
    if (!id) {
        if (flag(context, 'json')) {
            printJson(pending);
            return EXIT.success;
        }
        if (!pending.length) {
            terminal.write('No pending requests.\n');
            return EXIT.success;
        }
        if (!terminal.interactive) {
            for (const request of pending) {
                terminal.write(`${request.id}${request.blocking ? ' [blocking]' : ''}: ${request.reason}\n  ${request.question.replace(/\n/g, '\n  ')}\n${request.choices?.length ? `  Choices: ${request.choices.join(' | ')}\n` : ''}  Answer: ptbk answer ${request.id} "<answer>"\n`);
            }
            return EXIT.success;
        }
        const chosen = await selectOne(terminal, {
            frame: { title: 'ptbk answer', step: `${pending.length} pending request(s)` },
            question: 'Which request do you want to answer?',
            choices: pending.map((request) => ({ value: request.id, label: request.reason, description: `${request.id}${request.origin.taskTitle ? ` · ${request.origin.taskTitle}` : ''}` })),
            defaultValue: pending[0]!.id,
        });
        if (chosen === CANCELLED) return EXIT.incomplete;
        id = chosen;
    }
    const request = await store.get(id);
    if (!request) throw new PtbkError(`Request ${id} does not exist.`, { kind: 'not-found', next: ['Run `ptbk answer` to list pending requests.'] });
    if (request.status !== 'pending') throw new PtbkError(`Request ${id} was already ${request.status}.`, { kind: 'conflict', reason: request.answer ? `Recorded answer: ${request.answer}` : undefined, effect: 'Nothing was changed.' });
    if (flag(context, 'decline')) {
        await apply(id, value || 'Declined by the user.', 'rejected');
        terminal.write(`Declined ${id}.\n`);
        return EXIT.success;
    }
    if (!value) {
        if (!terminal.interactive) throw new PtbkError('An answer is required.', { kind: 'usage', next: [`Run \`ptbk answer ${id} "<answer>"\` or use --stdin.`] });
        terminal.write(`${terminal.style.bold(request.reason)}\n${request.question}\n\n`);
        const response = request.choices?.length
            ? await selectOne(terminal, { frame: { title: 'ptbk answer', step: id }, question: 'Your answer:', choices: request.choices.map((choice) => ({ value: choice, label: choice })) })
            : await composeText(terminal, { frame: { title: 'ptbk answer', step: id }, question: 'Your answer:', required: true });
        if (response === CANCELLED) {
            terminal.write('Not answered; the request stays pending.\n');
            return EXIT.incomplete;
        }
        value = response;
    }
    const resolved = await apply(id, value, 'answered');
    terminal.write(`Answered ${resolved.id}.${lookup.state === 'running' ? ' The service continues the affected work.' : ' The affected work continues on the next `ptbk start` or `ptbk run`.'}\n`);
    return EXIT.success;
}
