import { readFile, rm } from 'fs/promises';
import { join } from 'path';
import { serializeError } from '@promptbook-local/utils';
import {
    createAgentPlannedMessagesSidecarPath,
    parseAgentPlannedMessagesSidecar,
    type AgentPlannedMessageCommand,
} from '../../../../../src/book-3.0/AgentPlannedMessagesSidecar';
import {
    AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS,
    type CancelAgentGoalChatPlannedMessageResult,
    type SetAgentGoalChatPlannedMessageResult,
} from '../agentGoalChat/agentGoalChatPlannedMessageActions';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { LocalUserChatJobMetadata } from './LocalUserChatJobMetadata';

/**
 * Planned-message operations used while applying one sidecar.
 */
export type LocalAgentPlannedMessageActions = Pick<typeof AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS, 'set' | 'cancel'>;

/**
 * One planned-message command that was applied together with its result.
 *
 * The command carries what the agent asked for (for example the requested delay) and the result
 * carries what really happened, so the chat can show the wake-up below the message that planned it.
 */
export type AppliedAgentPlannedMessageCommand = {
    readonly command: AgentPlannedMessageCommand;
    readonly result: SetAgentGoalChatPlannedMessageResult | CancelAgentGoalChatPlannedMessageResult;
};

/**
 * Applies every planned-message command a coding harness wrote while answering one message.
 *
 * The sidecar is consumed exactly once: it is removed afterwards so a replayed worker tick can never
 * schedule the very same wake-up twice.
 *
 * @param options - Answered job, its agent folder path, and the local runner metadata of the message.
 * @returns Planned-message commands that were applied successfully, in sidecar order.
 */
export async function applyLocalAgentPlannedMessageCommands(options: {
    readonly job: Pick<UserChatJobRecord, 'id' | 'chatId' | 'agentPermanentId'>;
    readonly agentDirectoryPath: string;
    readonly metadata: LocalUserChatJobMetadata;
    readonly actions?: LocalAgentPlannedMessageActions;
}): Promise<ReadonlyArray<AppliedAgentPlannedMessageCommand>> {
    const sidecarPath = resolveLocalAgentPlannedMessagesSidecarPath(options.agentDirectoryPath, options.metadata);
    const sidecarContent = await readOptionalTextFile(sidecarPath);

    await removeLocalAgentPlannedMessagesSidecar(options.agentDirectoryPath, options.metadata);

    if (sidecarContent === null) {
        return [];
    }

    const sidecar = parseAgentPlannedMessagesSidecar(sidecarContent);

    if (!sidecar) {
        console.warn('[local-chat-runner] planned_messages_sidecar_unreadable', {
            chatId: options.job.chatId,
            jobId: options.job.id,
        });
        return [];
    }

    const actions = options.actions || AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS;
    const appliedCommands: Array<AppliedAgentPlannedMessageCommand> = [];

    for (const command of sidecar.commands) {
        const result = await applyLocalAgentPlannedMessageCommand({
            command,
            actions,
            agentPermanentId: options.job.agentPermanentId,
            job: options.job,
        });

        if (result) {
            appliedCommands.push({ command, result });
        }
    }

    return appliedCommands;
}

/**
 * Removes the planned-message sidecar of one queued message.
 *
 * @param agentDirectoryPath - Absolute path of the local agent folder.
 * @param metadata - Local runner metadata of the queued message.
 */
export async function removeLocalAgentPlannedMessagesSidecar(
    agentDirectoryPath: string,
    metadata: LocalUserChatJobMetadata,
): Promise<void> {
    await rm(resolveLocalAgentPlannedMessagesSidecarPath(agentDirectoryPath, metadata), { force: true }).catch(
        () => undefined,
    );
}

/**
 * Dispatches one planned-message command through the shared planned-message actions.
 *
 * One rejected command never blocks the remaining ones, because the agent already answered and the
 * harness owns this sidecar.
 *
 * @param options - Command, actions, and the agent whose goal chat owns the planned message.
 * @returns Result of the applied command, or `null` when it was rejected.
 *
 * @private function of `applyLocalAgentPlannedMessageCommands`
 */
async function applyLocalAgentPlannedMessageCommand(options: {
    readonly command: AgentPlannedMessageCommand;
    readonly actions: LocalAgentPlannedMessageActions;
    readonly agentPermanentId: string;
    readonly job: Pick<UserChatJobRecord, 'id' | 'chatId'>;
}): Promise<AppliedAgentPlannedMessageCommand['result'] | null> {
    try {
        if (options.command.action === 'set') {
            const plannedMessage = await options.actions.set({
                agentPermanentId: options.agentPermanentId,
                milliseconds: options.command.milliseconds,
                message: options.command.message,
            });

            console.info('[local-chat-runner]', 'planned_message_set', {
                chatId: options.job.chatId,
                jobId: options.job.id,
                timeoutId: plannedMessage.timeoutId,
                dueAt: plannedMessage.dueAt,
            });

            return plannedMessage;
        }

        const cancelledPlannedMessage = await options.actions.cancel({
            agentPermanentId: options.agentPermanentId,
            timeoutId: options.command.timeoutId,
        });

        console.info('[local-chat-runner]', 'planned_message_cancel', {
            chatId: options.job.chatId,
            jobId: options.job.id,
            timeoutId: cancelledPlannedMessage.timeoutId,
            status: cancelledPlannedMessage.status,
        });

        return cancelledPlannedMessage.status === 'cancelled' ? cancelledPlannedMessage : null;
    } catch (error) {
        console.error('[local-chat-runner]', 'planned_message_command_failed', {
            chatId: options.job.chatId,
            jobId: options.job.id,
            action: options.command.action,
            error: serializeError(error as Error),
        });

        return null;
    }
}

/**
 * Resolves the absolute planned-message sidecar path of one queued message.
 *
 * @param agentDirectoryPath - Absolute path of the local agent folder.
 * @param metadata - Local runner metadata of the queued message.
 * @returns Absolute sidecar path.
 *
 * @private function of `applyLocalAgentPlannedMessageCommands`
 */
function resolveLocalAgentPlannedMessagesSidecarPath(
    agentDirectoryPath: string,
    metadata: LocalUserChatJobMetadata,
): string {
    return join(agentDirectoryPath, createAgentPlannedMessagesSidecarPath(metadata.fileName));
}

/**
 * Reads one text file and treats a missing planned-message sidecar as absent.
 *
 * @param path - Absolute sidecar path.
 * @returns File content, or `null` when the sidecar does not exist.
 *
 * @private function of `applyLocalAgentPlannedMessageCommands`
 */
async function readOptionalTextFile(path: string): Promise<string | null> {
    try {
        return await readFile(path, 'utf-8');
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return null;
        }

        throw error;
    }
}

/**
 * Returns true when one filesystem error indicates a missing path.
 *
 * @param error - Caught filesystem failure.
 * @returns `true` for missing-path errors.
 *
 * @private function of `applyLocalAgentPlannedMessageCommands`
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
