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
 * Creates the timeout chips of the message that planned, re-planned, or cancelled a wake-up.
 *
 * The chat already renders `set_timeout` and `cancel_timeout` tool calls as timeout chips with a
 * detail popup, so one planned message becomes exactly one such tool call instead of a second
 * timeout presentation. A re-planned message keeps the scheduling chip, because it still ends with a
 * wake-up waiting ahead.
 *
 * @param options - Planned-message commands applied for one answered message.
 * @returns Timeout tool calls shown as chips below the answer.
 */
export function createPlannedMessageChipToolCalls(options: {
    readonly appliedCommands: ReadonlyArray<AppliedAgentPlannedMessageCommand>;
    readonly createdAt: NonNullable<ToolCall['createdAt']>;
}): ReadonlyArray<ToolCall> {
    return options.appliedCommands.map(({ command, result }) => ({
        name: result.action === 'cancel' ? CANCEL_TIMEOUT_TOOL_CALL_NAME : SET_TIMEOUT_TOOL_CALL_NAME,
        arguments: {
            ...(command.milliseconds === undefined ? {} : { milliseconds: command.milliseconds }),
            ...(command.cronExpression === undefined ? {} : { cronExpression: command.cronExpression }),
            ...(command.startsAt === undefined ? {} : { startsAt: command.startsAt }),
            ...(command.endsAt === undefined ? {} : { endsAt: command.endsAt }),
            ...(command.maxRunCount === undefined ? {} : { maxRunCount: command.maxRunCount }),
            ...(command.message === undefined ? {} : { message: command.message }),
            ...(command.timeoutId === undefined ? {} : { timeoutId: command.timeoutId }),
        },
        result,
        state: 'COMPLETE',
        idempotencyKey: `${PLANNED_MESSAGE_CHIP_IDEMPOTENCY_PREFIX}-${result.action}-${result.timeoutId}`,
        createdAt: options.createdAt,
    }));
}
