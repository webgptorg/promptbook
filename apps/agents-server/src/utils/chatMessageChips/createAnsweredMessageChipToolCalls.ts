import type { ToolCall } from '@promptbook-local/types';
import type { AppliedAgentPlannedMessageCommand } from '../localChatRunner/applyLocalAgentPlannedMessageCommands';
import { createPlannedMessageChipToolCalls } from './createPlannedMessageChipToolCalls';
import { createTouchedProjectChipToolCalls } from './createTouchedProjectChipToolCalls';

/**
 * Creates every extra chip shown below one answered chat message.
 *
 * This is the single place deciding what an answer shows besides its text: the wake-ups it
 * planned and the projects it worked with. The chips travel as tool calls of the assistant
 * message, so they are visible in every chat view — including external chats such as email,
 * whose outbound reply is rendered from the message text alone and therefore stays unchanged.
 *
 * @param options - Owning agent plus what the answered message planned and touched.
 * @returns Tool calls rendered as chips below the answer, in a stable order.
 */
export async function createAnsweredMessageChipToolCalls(options: {
    readonly agentPermanentId: string;
    readonly appliedPlannedMessageCommands: ReadonlyArray<AppliedAgentPlannedMessageCommand>;
    readonly touchedProjectNames: ReadonlyArray<string>;
    readonly createdAt?: NonNullable<ToolCall['createdAt']>;
}): Promise<ReadonlyArray<ToolCall>> {
    const createdAt = options.createdAt || (new Date().toISOString() as NonNullable<ToolCall['createdAt']>);
    const projectChipToolCalls = await createTouchedProjectChipToolCalls({
        agentPermanentId: options.agentPermanentId,
        touchedProjectNames: options.touchedProjectNames,
        createdAt,
    });

    return [
        ...projectChipToolCalls,
        ...createPlannedMessageChipToolCalls({
            appliedCommands: options.appliedPlannedMessageCommands,
            createdAt,
        }),
    ];
}
