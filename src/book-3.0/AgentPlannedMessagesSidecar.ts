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
export const AGENT_PLANNED_MESSAGE_COMMAND_ACTIONS = ['set', 'cancel'] as const;

/**
 * One planned-message command action.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentPlannedMessageCommandAction = (typeof AGENT_PLANNED_MESSAGE_COMMAND_ACTIONS)[number];

/**
 * One planned message that is already waiting to wake the agent.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentPlannedMessageSnapshot = {
    readonly timeoutId: string;
    readonly dueAt: string;
    readonly message: string | null;
};

/**
 * One command written by the coding harness into its planned-message sidecar.
 *
 * The payload stays untyped on purpose: it is untrusted harness output and is validated by the very
 * same shared planned-message actions that back the model tools and the internal runtime API.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentPlannedMessageCommand = {
    readonly action: AgentPlannedMessageCommandAction;
    readonly milliseconds?: unknown;
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

    return rawSnapshots.filter(isAgentPlannedMessageSnapshot);
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
