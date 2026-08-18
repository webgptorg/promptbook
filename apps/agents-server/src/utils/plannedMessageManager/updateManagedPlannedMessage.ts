import { AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS } from '../agentGoalChat/agentGoalChatPlannedMessageActions';
import type { PlannedMessageManagerRecord } from '../plannedMessagesAdmin';
import { getUserChatTimeoutById, setAgentScopedUserChatTimeoutPausedState } from '../userChatTimeout';
import { loadPlannedMessageManagerRecord } from './loadPlannedMessageManagerRecord';

/**
 * Change requested for one planned message, as it arrives from an administrator.
 *
 * Every schedule field is untrusted and validated by the shared planned-message service, exactly the
 * same way a schedule requested by an agent is. Only `isPaused` is checked before it gets here,
 * because no later step would check it.
 *
 * @private internal admin utility of Agents Server
 */
export type UpdateManagedPlannedMessageRequest = {
    readonly message?: unknown;
    readonly milliseconds?: unknown;
    readonly cronExpression?: unknown;
    readonly startsAt?: unknown;
    readonly endsAt?: unknown;
    readonly maxRunCount?: unknown;
    readonly isPaused?: boolean;
};

/**
 * Outcome of one administrator change to a planned message.
 *
 * `busy` means the planned message is firing right now, so its schedule is being consumed by that
 * very firing and cannot be rewritten underneath it.
 *
 * @private internal admin utility of Agents Server
 */
export type UpdateManagedPlannedMessageResult =
    | { readonly status: 'updated'; readonly plannedMessage: PlannedMessageManagerRecord }
    | { readonly status: 'not_found' }
    | { readonly status: 'busy' };

/**
 * Applies one administrator change to a planned message of any agent.
 *
 * The change goes through the very same planned-message service an agent re-plans itself with, so an
 * administrator can never write a schedule the agent itself could not have written.
 *
 * @param timeoutId - Id of the planned message being changed.
 * @param payload - Requested change, where an absent field keeps its stored value.
 * @returns Changed planned message, or why it could not be changed.
 *
 * @private internal admin utility of Agents Server
 */
export async function updateManagedPlannedMessage(
    timeoutId: string,
    payload: UpdateManagedPlannedMessageRequest,
): Promise<UpdateManagedPlannedMessageResult> {
    const existingPlannedMessage = await getUserChatTimeoutById(timeoutId);

    if (!existingPlannedMessage) {
        return { status: 'not_found' };
    }

    const { agentPermanentId } = existingPlannedMessage;

    if (isPlannedMessageScheduleChangeRequested(payload)) {
        const updateResult = await AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS.update({
            agentPermanentId,
            timeoutId,
            ...(payload.message === undefined ? {} : { message: payload.message }),
            ...(payload.milliseconds === undefined ? {} : { milliseconds: payload.milliseconds }),
            ...(payload.cronExpression === undefined ? {} : { cronExpression: payload.cronExpression }),
            ...(payload.startsAt === undefined ? {} : { startsAt: payload.startsAt }),
            ...(payload.endsAt === undefined ? {} : { endsAt: payload.endsAt }),
            ...(payload.maxRunCount === undefined ? {} : { maxRunCount: payload.maxRunCount }),
        });

        if (updateResult.status === 'not_found') {
            return { status: 'not_found' };
        }

        if (updateResult.status === 'busy') {
            return { status: 'busy' };
        }
    }

    if (payload.isPaused !== undefined) {
        const pauseResult = await setAgentScopedUserChatTimeoutPausedState({
            agentPermanentId,
            timeoutId,
            isPaused: payload.isPaused,
        });

        if (!pauseResult.isApplied) {
            return pauseResult.plannedMessage === null ? { status: 'not_found' } : { status: 'busy' };
        }
    }

    const changedPlannedMessage = await loadPlannedMessageManagerRecord(timeoutId);

    if (!changedPlannedMessage) {
        return { status: 'not_found' };
    }

    return { status: 'updated', plannedMessage: changedPlannedMessage };
}

/**
 * Determines whether one requested change touches the schedule or the text of a planned message.
 *
 * @param payload - Requested change.
 * @returns `true` when anything but the paused state was requested.
 *
 * @private function of `updateManagedPlannedMessage`
 */
function isPlannedMessageScheduleChangeRequested(payload: UpdateManagedPlannedMessageRequest): boolean {
    return (
        payload.message !== undefined ||
        payload.milliseconds !== undefined ||
        payload.cronExpression !== undefined ||
        payload.startsAt !== undefined ||
        payload.endsAt !== undefined ||
        payload.maxRunCount !== undefined
    );
}
