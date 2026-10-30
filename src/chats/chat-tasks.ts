import { findAgentReferences, formatAgentReference, normalizeAgentName, parseReferenceValue, toReference } from '../book/references.js';
import type { ActiveRecord } from '../engine/state.js';
import type { TaskPurpose } from '../tasks/purpose.js';
import { chatAgent, chatAgents, type ChatBook } from './chat-book.js';

/**
 * The `TASK ORIGIN` value of work created in a chat: `Chat {Full chat name}` (`Chat @Name` for a single word).
 *
 * @private chat/task relationships
 */
export function chatOrigin(chat: string): string {
    return `Chat ${formatAgentReference(chat)}`;
}

/**
 * A task an agent creates in a chat through its `create_task` tool (Talk to Tasker included).
 *
 * @private chat/task relationships
 */
export type ChatTaskInput = {
    readonly title: string;
    readonly description: string;
    readonly agent?: string;
    readonly priority?: number;
    /** Project-relative purpose the author gave it (absent: undefined, which is valid). */
    readonly purpose?: TaskPurpose;
    readonly chat: string;
};

/**
 * The commitments of a task created in a chat: the agent, priority and purpose its author gave, `TASK ORIGIN Chat
 * {chat}` and a LINK back. One construction for the running engine and a chat without a service.
 *
 * @private chat/task relationships
 */
export function chatTaskCommitments(input: ChatTaskInput): string[] {
    return [
        ...(input.agent ? [`TASK AGENT ${toReference(input.agent)}`] : []),
        ...(input.priority !== undefined ? [`TASK PRIORITY ${input.priority}`] : []),
        ...(input.purpose ? [`TASK PURPOSE ${input.purpose.toUpperCase()}`] : []),
        `TASK ORIGIN ${chatOrigin(input.chat)}`,
        `LINK ${formatAgentReference(input.chat)}`,
    ];
}

/**
 * The chat a task was created in (its default return conversation), from its `TASK ORIGIN`.
 *
 * @private chat/task relationships
 */
export function chatOriginOf(origin: string | undefined): string | undefined {
    const match = /^chat\s+(\{[^{}]+\}|@\S+)\s*$/i.exec(origin?.trim() ?? '');
    return match ? parseReferenceValue(match[1]!)?.name : undefined;
}

/**
 * Live state of a task as shown on its card in the source chat (presentation of the engine's own task state, not a
 * new lifecycle).
 *
 * @private chat/task relationships
 */
export type ChatTaskState = 'queued' | 'running' | 'waiting' | 'blocked' | 'completed' | 'failed';

/**
 * A live task card of a chat: the readable task, its actual state and what to open for details.
 *
 * @private chat/task relationships
 */
export type ChatTaskCard = {
    /** Declared task name (its reference is `{name}`). */
    readonly name: string;
    /** Task reference/source for the normal task detail. */
    readonly ref?: string;
    readonly state: ChatTaskState;
    /** Phase, waiting reason, blocker or result summary. */
    readonly detail?: string;
    /** Agent working on it (or that completed it). */
    readonly agent?: string;
    /** Result commit of a completed task. */
    readonly commit?: string;
};

/**
 * The agent whose question a waiting run asks (Fixer after a takeover).
 *
 * @private chat/task relationships
 */
export function questionAuthor(record: Pick<ActiveRecord, 'routing' | 'handover'>): string {
    return record.handover?.agent ?? record.routing.agent;
}

/**
 * Where a user message in a chat goes: the answer to one pending question (its author's waiting run resumes), a reply
 * by an explicitly mentioned participant, or the main agent. A message that could answer several questions (no
 * mention picks one) goes to the main agent instead of being applied to every wait.
 *
 * @private chat/task relationships
 */
export function routeUserMessage(chat: Pick<ChatBook, 'members'>, text: string, pending: readonly ActiveRecord[]): { readonly answers?: ActiveRecord; readonly agent?: string; readonly ambiguous?: boolean } {
    const agents = chatAgents(chat);
    const mentioned = [...new Set(findAgentReferences(text).map((reference) => reference.normalized))].filter((key) => agents.some((agent) => parseReferenceValue(agent)?.normalized === key));
    if (mentioned.length === 1) {
        const key = mentioned[0]!;
        const answers = pending.find((record) => normalizeAgentName(questionAuthor(record)) === key);
        if (answers) return { answers };
        return { agent: agents.find((agent) => parseReferenceValue(agent)?.normalized === key) };
    }
    if (pending.length === 1) return { answers: pending[0] };
    return { agent: chatAgent(chat), ambiguous: pending.length > 1 };
}
