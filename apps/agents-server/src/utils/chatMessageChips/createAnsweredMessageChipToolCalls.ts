import type { ToolCall } from '@promptbook-local/types';
import type { AgentMessageProjectChange } from '../../../../../src/utils/agent-message-runtime/AgentMessageProjectChange';
import type { AgentMessageTouchedExternalSource } from '../../../../../src/utils/agent-message-runtime/AgentMessageTouchedExternalSource';
import type { AppliedAgentPlannedMessageCommand } from '../localChatRunner/applyLocalAgentPlannedMessageCommands';
import { createPlannedMessageChipToolCalls } from './createPlannedMessageChipToolCalls';
import { createTouchedExternalSourceChipToolCalls } from './createTouchedExternalSourceChipToolCalls';
import { createTouchedProjectChipToolCalls } from './createTouchedProjectChipToolCalls';

/**
 * Creates every extra chip shown below one answered chat message.
 *
 * This is the single place deciding what an answer shows besides its text: the wake-ups it
 * planned, the projects it worked with — including what it changed in them — and the sources
 * outside the agent it touched. The chips
 * travel as tool calls of the assistant message, so they are visible in every chat view —
 * including external chats such as email, whose outbound reply is rendered from the message text
 * alone and therefore stays unchanged.
 *
 * @param options - Owning agent plus what the answered message planned and touched.
 * @returns Tool calls rendered as chips below the answer, in a stable order.
 */
export async function createAnsweredMessageChipToolCalls(options: {
    readonly agentPermanentId: string;
    readonly appliedPlannedMessageCommands: ReadonlyArray<AppliedAgentPlannedMessageCommand>;
    readonly touchedProjectNames: ReadonlyArray<string>;
    readonly projectChanges?: ReadonlyArray<AgentMessageProjectChange>;
    readonly touchedExternalSources: ReadonlyArray<AgentMessageTouchedExternalSource>;
    readonly createdAt?: NonNullable<ToolCall['createdAt']>;
}): Promise<ReadonlyArray<ToolCall>> {
    const createdAt = options.createdAt || (new Date().toISOString() as NonNullable<ToolCall['createdAt']>);
    const projectChipToolCalls = await createTouchedProjectChipToolCalls({
        agentPermanentId: options.agentPermanentId,
        touchedProjectNames: options.touchedProjectNames,
        projectChanges: options.projectChanges || [],
        createdAt,
    });

    return [
        ...projectChipToolCalls,
        ...createTouchedExternalSourceChipToolCalls({
            touchedExternalSources: options.touchedExternalSources,
            createdAt,
        }),
        ...createPlannedMessageChipToolCalls({
            appliedCommands: options.appliedPlannedMessageCommands,
            createdAt,
        }),
    ];
}
