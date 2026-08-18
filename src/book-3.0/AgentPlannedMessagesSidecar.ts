import { join } from 'path';
import { AGENT_MESSAGES_DIRECTORY_PATH } from './agentFolderPaths';
import { createAgentMessageSidecarBaseName } from './createAgentMessageSidecarBaseName';

// Note: [💞] This file defines the shared planned-message sidecar convention rather than one standalone entity.

/**
 * Relative directory holding the planned-message sidecar of each queued message.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export const AGENT_PLANNED_MESSAGES_DIRECTORY_PATH = join(AGENT_MESSAGES_DIRECTORY_PATH, 'planned');

/**
 * Command actions an agent can request from its planned-message sidecar.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export const AGENT_PLANNED_MESSAGE_COMMAND_ACTIONS = ['set', 'update', 'cancel'] as const;

/**
 * One planned-message command action.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentPlannedMessageCommandAction = (typeof AGENT_PLANNED_MESSAGE_COMMAND_ACTIONS)[number];

/**
 * One planned message that is already waiting to wake the agent.
 *
 * A planned message can repeat like `setInterval`, run a bounded number of times, or wake the agent
 * only once, so the whole schedule is what the agent compares with its goal, while `dueAt` only says
 * when the nearest wake-up happens.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentPlannedMessageSnapshot = {
    readonly timeoutId: string;
    readonly dueAt: string;
    readonly message: string | null;

    /**
     * Repeat interval in milliseconds, or `null` for a planned message that does not repeat at a fixed
     * interval.
     */
    readonly intervalMs: number | null;

    /**
     * Five-field cron expression driving the repetitions, or `null` when the planned message does not
     * follow a cron.
     */
    readonly cronExpression: string | null;

    /**
     * Moment before which the planned message never wakes the agent, or `null` when it has no starting
     * date.
     */
    readonly startsAt: string | null;

    /**
     * Moment after which the planned message never wakes the agent again, or `null` when it has no
     * ending date.
     */
    readonly endsAt: string | null;

    /**
     * Total number of wake-ups the planned message performs, or `null` when it repeats until it is
     * cancelled.
     */
    readonly maxRunCount: number | null;

    /**
     * Number of times the planned message already woke the agent.
     */
    readonly runCount: number;
};

/**
 * One command written by the coding harness into its planned-message sidecar.
 *
 * The payload stays untyped on purpose: it is untrusted harness output and is validated by the very
 * same shared planned-message actions that back the model tools and the internal runtime API.
 *
 * For a `set` command, `milliseconds` is the repeat interval of the planned message, not a one-shot
 * delay, and `cronExpression`, `startsAt`, `endsAt`, and `maxRunCount` bound how it repeats. An
 * `update` command changes the very same fields of the planned message named by `timeoutId`, where a
 * field that is left out stays as it is and an explicit `null` removes the bound.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentPlannedMessageCommand = {
    readonly action: AgentPlannedMessageCommandAction;
    readonly milliseconds?: unknown;
    readonly cronExpression?: unknown;
    readonly startsAt?: unknown;
    readonly endsAt?: unknown;
    readonly maxRunCount?: unknown;
    readonly message?: unknown;
    readonly timeoutId?: unknown;
};

/**
 * Planned-message sidecar prepared for one queued message.
 *
 * `currentPlannedMessages` is written by the Agents Server and is read-only for the agent, while
 * `commands` is the only channel through which a coding harness can plan or cancel a wake-up.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentPlannedMessagesSidecar = {
    readonly version: 1;
    readonly agentPermanentId: string;
    readonly currentPlannedMessages: ReadonlyArray<AgentPlannedMessageSnapshot>;
    readonly commands: ReadonlyArray<AgentPlannedMessageCommand>;
};

/**
 * Creates the relative planned-message sidecar path of one queued message.
 *
 * @param messageFileName - File name of the queued `.book` message.
 * @returns Relative path of the sidecar inside the agent folder.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export function createAgentPlannedMessagesSidecarPath(messageFileName: string): string {
    return join(AGENT_PLANNED_MESSAGES_DIRECTORY_PATH, `${createAgentMessageSidecarBaseName(messageFileName)}.json`);
}

/**
 * Serializes one planned-message sidecar into its stored representation.
 *
 * @param sidecar - Sidecar prepared for one queued message.
 * @returns Pretty-printed JSON the coding harness can edit by hand.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export function createAgentPlannedMessagesSidecarContent(sidecar: AgentPlannedMessagesSidecar): string {
    return `${JSON.stringify(sidecar, null, 2)}\n`;
}

/**
 * Parses one untrusted planned-message sidecar written back by a coding harness.
 *
 * A malformed sidecar never fails the already answered chat, so this returns `null` instead of throwing.
 *
 * @param sidecarContent - Raw file content read from the agent folder.
 * @returns Normalized sidecar, or `null` when it cannot be used.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export function parseAgentPlannedMessagesSidecar(sidecarContent: string): AgentPlannedMessagesSidecar | null {
    let parsedSidecar: unknown;

    try {
        parsedSidecar = JSON.parse(sidecarContent);
    } catch {
        return null;
    }

    if (!parsedSidecar || typeof parsedSidecar !== 'object' || Array.isArray(parsedSidecar)) {
        return null;
    }

    const sidecar = parsedSidecar as Partial<AgentPlannedMessagesSidecar>;

    if (sidecar.version !== 1 || typeof sidecar.agentPermanentId !== 'string') {
        return null;
    }

    return {
        version: 1,
        agentPermanentId: sidecar.agentPermanentId,
        currentPlannedMessages: normalizeAgentPlannedMessageSnapshots(sidecar.currentPlannedMessages),
        commands: normalizeAgentPlannedMessageCommands(sidecar.commands),
    };
}

/**
 * Keeps only the commands whose action is understood by the planned-message actions.
 *
 * @param rawCommands - Untrusted `commands` value read from one sidecar.
 * @returns Commands that can be dispatched, in their original order.
 *
 * @private internal utility of `parseAgentPlannedMessagesSidecar`
 */
function normalizeAgentPlannedMessageCommands(rawCommands: unknown): Array<AgentPlannedMessageCommand> {
    if (!Array.isArray(rawCommands)) {
        return [];
    }

    return rawCommands.filter(isAgentPlannedMessageCommand);
}

/**
 * Checks whether one untrusted sidecar entry names a supported planned-message action.
 *
 * @param value - Untrusted command entry.
 * @returns `true` when the entry can be dispatched.
 *
 * @private internal utility of `parseAgentPlannedMessagesSidecar`
 */
function isAgentPlannedMessageCommand(value: unknown): value is AgentPlannedMessageCommand {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const action = (value as AgentPlannedMessageCommand).action;

    return (
        typeof action === 'string' &&
        AGENT_PLANNED_MESSAGE_COMMAND_ACTIONS.includes(action as AgentPlannedMessageCommandAction)
    );
}

/**
 * Keeps only the already planned messages that can be shown to the agent.
 *
 * @param rawSnapshots - Untrusted `currentPlannedMessages` value read from one sidecar.
 * @returns Planned-message snapshots with the fields required for display and cancellation.
 *
 * @private internal utility of `parseAgentPlannedMessagesSidecar`
 */
function normalizeAgentPlannedMessageSnapshots(rawSnapshots: unknown): Array<AgentPlannedMessageSnapshot> {
    if (!Array.isArray(rawSnapshots)) {
        return [];
    }

    return rawSnapshots.filter(isAgentPlannedMessageSnapshot).map(createNormalizedAgentPlannedMessageSnapshot);
}

/**
 * Normalizes the optional fields of one already planned message.
 *
 * @param snapshot - Planned-message entry with the required identity fields.
 * @returns Snapshot with a usable schedule and message.
 *
 * @private internal utility of `parseAgentPlannedMessagesSidecar`
 */
function createNormalizedAgentPlannedMessageSnapshot(
    snapshot: AgentPlannedMessageSnapshot,
): AgentPlannedMessageSnapshot {
    return {
        timeoutId: snapshot.timeoutId,
        dueAt: snapshot.dueAt,
        message: typeof snapshot.message === 'string' ? snapshot.message : null,
        intervalMs: normalizeAgentPlannedMessagePositiveCount(snapshot.intervalMs),
        cronExpression: typeof snapshot.cronExpression === 'string' ? snapshot.cronExpression : null,
        startsAt: typeof snapshot.startsAt === 'string' ? snapshot.startsAt : null,
        endsAt: typeof snapshot.endsAt === 'string' ? snapshot.endsAt : null,
        maxRunCount: normalizeAgentPlannedMessagePositiveCount(snapshot.maxRunCount),
        runCount: normalizeAgentPlannedMessagePositiveCount(snapshot.runCount) || 0,
    };
}

/**
 * Normalizes one optional positive whole number of a planned-message snapshot.
 *
 * @param value - Untrusted interval, run count, or run-count limit.
 * @returns Whole positive number, or `null` when the value cannot be used.
 *
 * @private internal utility of `parseAgentPlannedMessagesSidecar`
 */
function normalizeAgentPlannedMessagePositiveCount(value: unknown): number | null {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : null;
}

/**
 * Checks whether one untrusted sidecar entry describes an already planned message.
 *
 * @param value - Untrusted planned-message entry.
 * @returns `true` when the entry can be shown and cancelled.
 *
 * @private internal utility of `parseAgentPlannedMessagesSidecar`
 */
function isAgentPlannedMessageSnapshot(value: unknown): value is AgentPlannedMessageSnapshot {
    return Boolean(
        value &&
            typeof value === 'object' &&
            typeof (value as AgentPlannedMessageSnapshot).timeoutId === 'string' &&
            typeof (value as AgentPlannedMessageSnapshot).dueAt === 'string',
    );
}
