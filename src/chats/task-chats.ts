import { formatAgentReference, parseReferenceValue, referenceName } from '../book/references.js';
import type { ChatBook } from './chat-book.js';
import type { ChatStore } from './store.js';

/**
 * Chat operations available to an executing task (TEAM @User, browser sign-in, recovery) and its consultations.
 *
 * @private chats
 */
export type TaskChats = {
    /**
     * Starts or continues the agent→User chat for a genuine blocker; repeated reports of the same unresolved question
     * reuse the waiting chat instead of asking again. Returns the chat and the message count to wait beyond.
     */
    readonly askUser: (input: { readonly agent: string; readonly question: string; readonly reason?: string; readonly attempted?: string; readonly choices?: readonly string[] }) => Promise<{ readonly chat: string; readonly awaited: number; readonly reused: boolean }>;
    /** Records a task-scoped agent↔agent consultation; it is saved with the task's single result commit. */
    readonly recordConsultation: (input: { readonly from: string; readonly to: string; readonly question: string; readonly answer: string }) => Promise<string | undefined>;
};

/**
 * Whether a chat links a task (by normalized name).
 */
function linksTask(chat: ChatBook, taskKey: string): boolean {
    return chat.links.some((link) => parseReferenceValue(link)?.normalized === taskKey);
}

/**
 * Composes the agent's message: what is blocked, what was attempted and the minimal question/action.
 */
function questionText(input: { question: string; reason?: string; attempted?: string }): string {
    return [input.reason?.trim(), input.attempted?.trim() ? `Already attempted: ${input.attempted.trim()}` : undefined, input.question.trim()].filter(Boolean).join('\n\n');
}

/**
 * Chat operations of a consultation serving a human-facing conversation without an owning task (e.g. Chatter asking
 * a specialist): each bounded two-agent exchange is its own chat Book linked to the conversation and persisted as an
 * ordinary scoped authoring operation — never a fabricated task, a task result or a participant of the human chat.
 *
 * @private chats
 */
export function conversationChats(store: ChatStore, conversation: string, options: { readonly takenNames: () => ReadonlySet<string> }): TaskChats {
    return {
        askUser: async () => {
            throw new Error('Advisors of a conversation cannot ask the user; the conversation agent replies to the user itself.');
        },
        recordConsultation: async (input) => {
            const from = formatAgentReference(referenceName(input.from));
            const to = formatAgentReference(referenceName(input.to));
            const created = await store.create({
                name: `Consultation: ${referenceName(input.from)} with ${referenceName(input.to)} for ${conversation}`.slice(0, 120),
                members: [from, to],
                status: 'resolved',
                links: [`{{${conversation}}}`],
                messages: [
                    { sender: from, text: input.question },
                    { sender: to, text: input.answer },
                ],
                taken: options.takenNames(),
                commit: true,
            });
            return created.chat.name;
        },
    };
}

/**
 * Chat operations bound to one task.
 *
 * @private chats
 */
export function taskChats(store: ChatStore, task: { readonly name: string; readonly key: string }, options: { readonly takenNames: () => ReadonlySet<string>; readonly onCreated?: (path: string) => void }): TaskChats {
    const taskRef = `{{${task.name}}}`;
    return {
        askUser: async (input) => {
            const agentRef = formatAgentReference(referenceName(input.agent));
            const text = questionText(input);
            const agentKey = parseReferenceValue(agentRef)?.normalized;
            const existing = (await store.list()).find(
                (stored) => linksTask(stored.chat, task.key) && stored.chat.members.some((member) => parseReferenceValue(member)?.normalized === agentKey) && stored.chat.members.some((member) => parseReferenceValue(member)?.normalized === 'user'),
            );
            if (existing) {
                const last = [...existing.chat.messages].reverse().find((message) => message.senderKey === agentKey);
                // The same still-unanswered question is never sent twice.
                if (existing.chat.status === 'waiting-for-user' && last && last.text.trim() === text.trim()) return { chat: existing.chat.name, awaited: existing.chat.messages.length, reused: true };
                const written = await store.append(existing.chat.name, { sender: agentRef, text, choices: input.choices }, { status: 'waiting-for-user', trailers: { 'Task-Name': task.name } });
                return { chat: written.chat.name, awaited: written.chat.messages.length, reused: false };
            }
            const created = await store.create({
                name: `${referenceName(input.agent)} asks: ${input.question.split('\n').find((line) => line.trim())?.trim().slice(0, 70) ?? task.name}`,
                members: ['@User', agentRef],
                status: 'waiting-for-user',
                links: [taskRef],
                messages: [{ sender: agentRef, text, choices: input.choices }],
                taken: options.takenNames(),
                trailers: { 'Task-Name': task.name },
            });
            options.onCreated?.(created.path);
            return { chat: created.chat.name, awaited: created.chat.messages.length, reused: false };
        },
        recordConsultation: async (input) => {
            const from = formatAgentReference(referenceName(input.from));
            const to = formatAgentReference(referenceName(input.to));
            const created = await store.create({
                name: `Consultation: ${referenceName(input.from)} with ${referenceName(input.to)} on ${task.name}`.slice(0, 120),
                members: [from, to],
                status: 'resolved',
                links: [taskRef],
                messages: [
                    { sender: from, text: input.question },
                    { sender: to, text: input.answer },
                ],
                taken: options.takenNames(),
            });
            return created.chat.name;
        },
    };
}
