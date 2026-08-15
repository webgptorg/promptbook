import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
    createAgentPlannedMessagesSidecarContent,
    createAgentPlannedMessagesSidecarPath,
    type AgentPlannedMessageSnapshot,
    type AgentPlannedMessagesSidecar,
} from '../../../../../src/book-3.0/AgentPlannedMessagesSidecar';
import { AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS } from '../agentGoalChat/agentGoalChatPlannedMessageActions';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { LocalAgentFolder } from './ensureLocalAgentFolder';
import type { LocalUserChatJobMetadata } from './LocalUserChatJobMetadata';

/**
 * Writes the planned-message sidecar a coding harness uses to see and change its future wake-ups.
 *
 * The sidecar is the only planning channel of a locally executed turn: the harness never has to reach
 * the Agents Server over the network, and a wake-up exists only when it was actually requested here.
 * Planned messages repeat on their own, so an empty `commands` array keeps the current plan intact.
 *
 * @param options - Answered job, its agent folder, and the local runner metadata of the queued message.
 */
export async function prepareLocalAgentPlannedMessagesSidecar(options: {
    readonly job: Pick<UserChatJobRecord, 'agentPermanentId'>;
    readonly agentFolder: LocalAgentFolder;
    readonly metadata: LocalUserChatJobMetadata;
}): Promise<void> {
    const sidecarPath = join(
        options.agentFolder.directoryPath,
        createAgentPlannedMessagesSidecarPath(options.metadata.fileName),
    );
    const plannedMessages = await AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS.list({
        agentPermanentId: options.job.agentPermanentId,
    });
    const sidecar: AgentPlannedMessagesSidecar = {
        version: 1,
        agentPermanentId: options.job.agentPermanentId,
        currentPlannedMessages: plannedMessages.items.map(createLocalAgentPlannedMessageSnapshot),
        commands: [],
    };

    await mkdir(dirname(sidecarPath), { recursive: true });
    await writeFile(sidecarPath, createAgentPlannedMessagesSidecarContent(sidecar), 'utf-8');
}

/**
 * Reduces one stored planned message to the fields a coding harness needs.
 *
 * @param plannedMessage - Planned message returned by the shared planned-message actions.
 * @returns Snapshot written into the sidecar.
 *
 * @private function of `prepareLocalAgentPlannedMessagesSidecar`
 */
function createLocalAgentPlannedMessageSnapshot(plannedMessage: {
    readonly timeoutId: string;
    readonly dueAt: string;
    readonly message: string | null;
    readonly intervalMs: number | null;
}): AgentPlannedMessageSnapshot {
    return {
        timeoutId: plannedMessage.timeoutId,
        dueAt: plannedMessage.dueAt,
        message: plannedMessage.message,
        intervalMs: plannedMessage.intervalMs,
    };
}
