import { findActiveReferences, formatAgentReference, normalizeAgentName, parseReferenceValue, toReference } from '../book/references.js';
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
 * Where one accepted user message goes.
 *
 * @private chat/task relationships
 */
export type UserMessageRoute = {
    /** Agents the message explicitly addresses, in written order. */
    readonly addressed: readonly string[];
    /** The pending question it answers. */
    readonly answers?: ActiveRecord;
    /** The first agent to reply (the main agent of an unaddressed message). */
    readonly agent?: string;
    /** It could answer several questions, so none of them takes it. */
    readonly ambiguous?: boolean;
};

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
export type ChatTaskState = 'queued' | 'running' | 'waiting' | 'blocked' | 'completed' | 'failed' | 'cancelled' | 'retired';

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
    /** It was reopened after an earlier completion or cancellation. */
    readonly reopened?: boolean;
    /** Instruction receipts still outstanding, in plain words. */
    readonly receipts?: readonly string[];
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
 * by an explicitly addressed participant (`+@Name`, `+{Full Name}`), or the main agent. A plain mention changes nothing.
 * A message that could answer several questions (no address picks one) goes to the main agent instead of being applied to
 * every wait, and several addressed agents keep distinct requests instead of a broadcast to every member.
 *
 * @private chat/task relationships
 */
export function routeUserMessage(chat: Pick<ChatBook, 'members'>, text: string, pending: readonly ActiveRecord[], invited: readonly string[] = []): UserMessageRoute {
    const agents = [...chatAgents(chat), ...invited];
    const keyOf = (agent: string): string | undefined => parseReferenceValue(agent)?.normalized;
    const addressed = findActiveReferences(text).flatMap((reference) => agents.find((agent) => keyOf(agent) === reference.normalized) ?? []);
    if (addressed.length) {
        const authors = addressed.filter((agent) => pending.some((record) => normalizeAgentName(questionAuthor(record)) === keyOf(agent)));
        // One message answers at most one question; several addressed authors keep their distinct waits.
        const answers = authors.length === 1 ? pending.find((record) => normalizeAgentName(questionAuthor(record)) === keyOf(authors[0]!)) : undefined;
        const others = addressed.filter((agent) => !answers || keyOf(agent) !== normalizeAgentName(questionAuthor(answers)));
        return { addressed, ...(answers ? { answers } : {}), ...(others.length ? { agent: others[0] } : {}), ...(authors.length > 1 ? { ambiguous: true } : {}) };
    }
    if (pending.length === 1) return { addressed: [], answers: pending[0] };
    return { addressed: [], agent: chatAgent(chat), ambiguous: pending.length > 1 };
}
