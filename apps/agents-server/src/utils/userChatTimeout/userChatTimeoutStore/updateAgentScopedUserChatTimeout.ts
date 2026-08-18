import type { Json } from '@/src/database/schema';
import type {
    UpdateAgentScopedUserChatTimeoutOptions,
    UserChatTimeoutRecord,
    UserChatTimeoutRow,
} from '../UserChatTimeoutRecord';
import {
    normalizePlannedMessageCronExpression,
    normalizePlannedMessageDateIso,
    normalizePlannedMessageMaxRunCount,
} from '../plannedMessageSchedule';
import { getAgentScopedUserChatTimeout } from './getAgentScopedUserChatTimeout';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { isTerminalUserChatTimeoutStatus } from './isTerminalUserChatTimeoutStatus';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { normalizeRecurrenceIntervalMs } from './normalizeRecurrenceIntervalMs';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';
import { resolvePatchedDueAtIso } from './resolvePatchedDueAtIso';

/**
 * Updates one timeout scoped by user and agent.
 *
 * @private function of userChatTimeoutStore
 */
export async function updateAgentScopedUserChatTimeout(
    options: UpdateAgentScopedUserChatTimeoutOptions,
): Promise<UserChatTimeoutRecord | null> {
    const existingTimeout = await getAgentScopedUserChatTimeout(options);

    if (!existingTimeout) {
        return null;
    }

    if (isTerminalUserChatTimeoutStatus(existingTimeout.status) || existingTimeout.status === 'RUNNING') {
        return existingTimeout;
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
        updatedAt: nowIso,
    };

    let hasPatchChanges = false;

    if (Object.prototype.hasOwnProperty.call(options.patch, 'message')) {
        updatePayload.message =
            typeof options.patch.message === 'string' && options.patch.message.trim().length > 0
                ? options.patch.message.trim()
                : null;
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'parameters')) {
        updatePayload.parameters = (options.patch.parameters || {}) satisfies Record<string, unknown> as Json;
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'recurrenceIntervalMs')) {
        updatePayload.recurrenceIntervalMs = normalizeRecurrenceIntervalMs(options.patch.recurrenceIntervalMs);
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'cronExpression')) {
        updatePayload.cronExpression = normalizePlannedMessageCronExpression(options.patch.cronExpression);
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'startsAt')) {
        updatePayload.startsAt = normalizePlannedMessageDateIso(options.patch.startsAt);
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'endsAt')) {
        updatePayload.endsAt = normalizePlannedMessageDateIso(options.patch.endsAt);
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'maxRunCount')) {
        updatePayload.maxRunCount = normalizePlannedMessageMaxRunCount(options.patch.maxRunCount);
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'pausedAt')) {
        updatePayload.pausedAt = options.patch.pausedAt || null;
        hasPatchChanges = true;
    }

    const nextDueAtIso = resolvePatchedDueAtIso({
        existingDueAt: existingTimeout.dueAt,
        dueAt: options.patch.dueAt,
        extendByMs: options.patch.extendByMs,
    });

    if (nextDueAtIso !== null) {
        updatePayload.dueAt = nextDueAtIso;
        updatePayload.queuedAt = nowIso;
        updatePayload.durationMs = Math.max(0, Date.parse(nextDueAtIso) - Date.now());
        hasPatchChanges = true;
    }

    if (!hasPatchChanges) {
        return existingTimeout;
    }

    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    let updateQuery = userChatTimeoutTable
        .update(updatePayload)
        .eq('id', options.timeoutId)
        .eq('agentPermanentId', options.agentPermanentId)
        .eq('status', existingTimeout.status);

    // Note: A planned message belongs to the agent, so the goal chat edits it without naming one user
    if (typeof options.userId === 'number') {
        updateQuery = updateQuery.eq('userId', options.userId);
    }

    const { data, error } = await updateQuery.select('*').maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to update scoped user chat timeout "${options.timeoutId}": ${error.message}`);
    }

    if (!data) {
        return getAgentScopedUserChatTimeout(options);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
}
