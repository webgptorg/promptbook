import type { PlannedMessageManagerRecord } from '../plannedMessagesAdmin';
import { isAgentGoalChatId } from '../agentGoalChat/agentGoalChatIdentity';
import type { UserChatTimeoutRecord } from '../userChatTimeout/UserChatTimeoutRecord';
import { resolvePlannedMessageEndReason } from './resolvePlannedMessageEndReason';
import { resolvePlannedMessageLifecycle } from './resolvePlannedMessageLifecycle';
import { resolvePlannedMessageRecurrenceKind } from './resolvePlannedMessageRecurrenceKind';

/**
 * Everything needed to turn one stored timeout into a manager row.
 *
 * @private type of `mapPlannedMessageManagerRecord`
 */
type MapPlannedMessageManagerRecordOptions = {
    readonly plannedMessage: UserChatTimeoutRecord;
    readonly usernamesById: ReadonlyMap<number, string>;
    readonly agentNamesByPermanentId: ReadonlyMap<string, string | null>;

    /**
     * Moment the stage of the planned message is judged at.
     */
    readonly atDate: Date;
};

/**
 * Maps one stored timeout into the row shown by the admin planned-message manager.
 *
 * The stage and the ending reason are derived here once, so every later step — filtering, counting,
 * and rendering — reads the same answer instead of judging the raw columns again.
 *
 * @param options - Stored timeout with the names of its agent and owner.
 * @returns Planned-message manager row.
 *
 * @private internal admin utility of Agents Server
 */
export function mapPlannedMessageManagerRecord(
    options: MapPlannedMessageManagerRecordOptions,
): PlannedMessageManagerRecord {
    const { plannedMessage, usernamesById, agentNamesByPermanentId, atDate } = options;
    const lifecycle = resolvePlannedMessageLifecycle(plannedMessage, atDate);

    return {
        timeoutId: plannedMessage.timeoutId,
        status: plannedMessage.status,
        lifecycle,
        recurrenceKind: resolvePlannedMessageRecurrenceKind(plannedMessage),
        endReason: lifecycle === 'ENDED' ? resolvePlannedMessageEndReason(plannedMessage, atDate) : null,
        message: plannedMessage.message,

        createdAt: plannedMessage.createdAt,
        updatedAt: plannedMessage.updatedAt,
        dueAt: plannedMessage.dueAt,
        startsAt: plannedMessage.startsAt,
        endsAt: plannedMessage.endsAt,
        lastFiredAt: plannedMessage.lastFiredAt,
        completedAt: plannedMessage.completedAt,
        cancelRequestedAt: plannedMessage.cancelRequestedAt,
        pausedAt: plannedMessage.pausedAt,

        recurrenceIntervalMs: plannedMessage.recurrenceIntervalMs,
        cronExpression: plannedMessage.cronExpression,
        maxRunCount: plannedMessage.maxRunCount,
        runCount: plannedMessage.runCount,
        attemptCount: plannedMessage.attemptCount,
        failureReason: plannedMessage.failureReason,

        userId: plannedMessage.userId,
        username: usernamesById.get(plannedMessage.userId) ?? null,
        agentPermanentId: plannedMessage.agentPermanentId,
        agentName: agentNamesByPermanentId.get(plannedMessage.agentPermanentId) ?? null,
        chatId: plannedMessage.chatId,
        isAgentGoalChat: isAgentGoalChatId(plannedMessage.chatId),
    };
}
