import type { Json } from '@/src/database/schema';
import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../../src/errors/ParseError';
import { $randomBase58 } from '../../../../../../src/utils/random/$randomBase58';
import type {
    CreateUserChatTimeoutOptions,
    UserChatTimeoutInsert,
    UserChatTimeoutRecord,
    UserChatTimeoutRow,
} from '../UserChatTimeoutRecord';
import {
    normalizePlannedMessageCronExpression,
    normalizePlannedMessageDateIso,
    normalizePlannedMessageMaxRunCount,
    resolvePlannedMessageDueAt,
    type PlannedMessageSchedule,
} from '../plannedMessageSchedule';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { normalizeRecurrenceIntervalMs } from './normalizeRecurrenceIntervalMs';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Prefix used for generated timeout identifiers.
 *
 * @private function of createUserChatTimeout
 */
const USER_CHAT_TIMEOUT_ID_PREFIX = 'tmo_';

/**
 * Length of generated timeout id suffixes.
 *
 * @private function of createUserChatTimeout
 */
const GENERATED_USER_CHAT_TIMEOUT_ID_LENGTH = 14;

/**
 * Human-readable fallback used when timeout persistence is unavailable because
 * the database migration has not been applied yet.
 *
 * @private function of createUserChatTimeout
 */
const USER_CHAT_TIMEOUT_TABLE_UNAVAILABLE_MESSAGE =
    'User chat timeouts are unavailable until the `UserChatTimeout` database migration is applied.';

/**
 * Creates one durable queued timeout for a chat thread.
 *
 * @private function of userChatTimeoutStore
 */
export async function createUserChatTimeout(options: CreateUserChatTimeoutOptions): Promise<UserChatTimeoutRecord> {
    const nowIso = new Date().toISOString();
    const timeoutId =
        options.id || `${USER_CHAT_TIMEOUT_ID_PREFIX}${$randomBase58(GENERATED_USER_CHAT_TIMEOUT_ID_LENGTH)}`;
    const schedule = createUserChatTimeoutSchedule(options);
    const dueAt = options.dueAt || resolveCreatedUserChatTimeoutDueAtIso(schedule, options.durationMs ?? null);
    const durationMs = options.durationMs ?? Math.max(0, Date.parse(dueAt) - Date.parse(nowIso));
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const insertPayload: UserChatTimeoutInsert = {
        id: timeoutId,
        createdAt: nowIso,
        updatedAt: nowIso,
        chatId: options.chatId,
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        status: 'QUEUED',
        message: options.message || null,
        parameters: (options.parameters || {}) satisfies Record<string, unknown> as Json,
        durationMs,
        dueAt,
        recurrenceIntervalMs: schedule.recurrenceIntervalMs,
        cronExpression: schedule.cronExpression,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        maxRunCount: schedule.maxRunCount,
        queuedAt: nowIso,
        pausedAt: null,
        attemptCount: 0,
        runCount: 0,
        lastFiredAt: null,
    };

    const { data, error } = await userChatTimeoutTable.insert(insertPayload).select('*').maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            throw new Error(USER_CHAT_TIMEOUT_TABLE_UNAVAILABLE_MESSAGE);
        }

        throw new Error(`Failed to create user chat timeout for chat "${options.chatId}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`Failed to insert user chat timeout for chat "${options.chatId}".`);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
}

/**
 * Collects the recurrence rule of one newly created timeout.
 *
 * @param options - Input of the created timeout.
 * @returns Normalized recurrence rule.
 *
 * @private function of createUserChatTimeout
 */
function createUserChatTimeoutSchedule(options: CreateUserChatTimeoutOptions): PlannedMessageSchedule {
    return {
        recurrenceIntervalMs: normalizeRecurrenceIntervalMs(options.recurrenceIntervalMs),
        cronExpression: normalizePlannedMessageCronExpression(options.cronExpression),
        startsAt: normalizePlannedMessageDateIso(options.startsAt),
        endsAt: normalizePlannedMessageDateIso(options.endsAt),
        maxRunCount: normalizePlannedMessageMaxRunCount(options.maxRunCount),
    };
}

/**
 * Resolves when one newly created timeout fires for the first time.
 *
 * @param schedule - Recurrence rule of the created timeout.
 * @param fallbackDelayMs - Delay used by a timeout that does not repeat.
 * @returns ISO time of the first wake-up.
 *
 * @private function of createUserChatTimeout
 */
function resolveCreatedUserChatTimeoutDueAtIso(
    schedule: PlannedMessageSchedule,
    fallbackDelayMs: number | null,
): string {
    const dueAtDate = resolvePlannedMessageDueAt({
        schedule,
        completedRunCount: 0,
        afterDate: new Date(),
        fallbackDelayMs,
    });

    if (dueAtDate === null) {
        throw new ParseError(
            spaceTrim(`
                This planned message would never wake the agent.

                - Its schedule is already over, for example because \`endsAt\` is in the past or \`maxRunCount\` is exhausted.
                - Plan a schedule with at least one wake-up still ahead.
            `),
        );
    }

    return dueAtDate.toISOString();
}
