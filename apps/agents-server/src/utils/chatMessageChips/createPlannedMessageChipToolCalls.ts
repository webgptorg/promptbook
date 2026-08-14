import type { ToolCall } from '@promptbook-local/types';
import {
    CANCEL_TIMEOUT_TOOL_CALL_NAME,
    SET_TIMEOUT_TOOL_CALL_NAME,
} from '../../../../../src/book-components/Chat/utils/timeoutToolCallPresentation';
import type { AppliedAgentPlannedMessageCommand } from '../localChatRunner/applyLocalAgentPlannedMessageCommands';

/**
 * Prefix of the idempotency keys identifying planned-message chips.
 */
const PLANNED_MESSAGE_CHIP_IDEMPOTENCY_PREFIX = 'planned-message';

/**
 * Creates the timeout chips of the message that planned or cancelled a wake-up.
 *
 * The chat already renders `set_timeout` and `cancel_timeout` tool calls as timeout chips with a
 * detail popup, so one planned message becomes exactly one such tool call instead of a second
 * timeout presentation.
 *
 * @param options - Planned-message commands applied for one answered message.
 * @returns Timeout tool calls shown as chips below the answer.
 */
export function createPlannedMessageChipToolCalls(options: {
    readonly appliedCommands: ReadonlyArray<AppliedAgentPlannedMessageCommand>;
    readonly createdAt: NonNullable<ToolCall['createdAt']>;
}): ReadonlyArray<ToolCall> {
    return options.appliedCommands.map(({ command, result }) => ({
        name: result.action === 'set' ? SET_TIMEOUT_TOOL_CALL_NAME : CANCEL_TIMEOUT_TOOL_CALL_NAME,
        arguments: {
            ...(command.milliseconds === undefined ? {} : { milliseconds: command.milliseconds }),
            ...(command.message === undefined ? {} : { message: command.message }),
            ...(command.timeoutId === undefined ? {} : { timeoutId: command.timeoutId }),
        },
        result,
        state: 'COMPLETE',
        idempotencyKey: `${PLANNED_MESSAGE_CHIP_IDEMPOTENCY_PREFIX}-${result.action}-${result.timeoutId}`,
        createdAt: options.createdAt,
    }));
}
