import { usageToWorktime } from '@promptbook-local/core';
import type { UsageActorType } from '../usageAdmin';
import type {
    UsageAnalyticsCall,
    UsageAnalyticsChatHistoryRow,
    UsageAnalyticsCountsForWorktime,
    UsageAnalyticsSerializedUncertainNumber,
    UsageAnalyticsSerializedUsage,
} from './UsageAnalyticsModel';
import { UsageAnalyticsQuery } from './UsageAnalyticsQuery';

/**
 * Call-level derivation and metric extraction helpers.
 * @private function of getUsageAnalyticsResponse
 */
export const UsageAnalyticsCallMetrics = {
    isUserCallRow(row: UsageAnalyticsChatHistoryRow): boolean {
        if (!row.message || typeof row.message !== 'object') {
            return false;
        }

        const role = (row.message as { role?: unknown }).role;
        return typeof role === 'string' && role.toUpperCase() === 'USER';
    },

    toUsageAnalyticsCall(row: UsageAnalyticsChatHistoryRow): UsageAnalyticsCall {
        const { tokens, priceUsd, duration, humanDuration } = extractUsageMetrics(row.usage);

        return {
            createdAt: row.createdAt,
            agentName: row.agentName,
            callType: resolveCallType(row),
            actorType: resolveActorType(row),
            userId: row.userId,
            apiKey: UsageAnalyticsQuery.normalizeOptionalText(row.apiKey),
            userAgent: UsageAnalyticsQuery.normalizeUserAgent(row.userAgent),
            tokens,
            priceUsd,
            duration,
            humanDuration,
        };
    },

    matchesActorTypeAndCallType(
        call: UsageAnalyticsCall,
        filters: { callType: UsageAnalyticsCall['callType'] | null; actorType: UsageActorType | null },
    ): boolean {
        if (filters.callType && call.callType !== filters.callType) {
            return false;
        }
        if (filters.actorType && call.actorType !== filters.actorType) {
            return false;
        }
        return true;
    },
};

/**
 * Derives call type from one chat-history row.
 */
function resolveCallType(row: UsageAnalyticsChatHistoryRow): UsageAnalyticsCall['callType'] {
    if (row.source === 'OPENAI_API_COMPATIBILITY') {
        return 'COMPATIBLE_API';
    }

    const isVoiceCall =
        typeof row.message === 'object' &&
        row.message !== null &&
        (row.message as { isVoiceCall?: unknown }).isVoiceCall === true;

    return isVoiceCall ? 'VOICE_CHAT' : 'WEB_CHAT';
}

/**
 * Resolves actor type from row data with backward-compatible fallback.
 */
function resolveActorType(row: UsageAnalyticsChatHistoryRow): UsageAnalyticsCall['actorType'] {
    if (row.actorType === 'ANONYMOUS' || row.actorType === 'TEAM_MEMBER' || row.actorType === 'API_KEY') {
        return row.actorType;
    }

    if (UsageAnalyticsQuery.normalizeOptionalText(row.apiKey)) {
        return 'API_KEY';
    }

    if (row.source === 'OPENAI_API_COMPATIBILITY') {
        return 'TEAM_MEMBER';
    }

    return 'ANONYMOUS';
}

/**
 * Converts one usage JSON payload to normalized numeric metrics for analytics.
 */
function extractUsageMetrics(rawUsage: UsageAnalyticsChatHistoryRow['usage']): {
    tokens: number;
    priceUsd: number;
    duration: number;
    humanDuration: number;
} {
    const usage = rawUsage as UsageAnalyticsSerializedUsage;
    const inputWordsCount = readUsageUncertainNumber(usage?.input?.wordsCount);
    const outputWordsCount = readUsageUncertainNumber(usage?.output?.wordsCount);

    return {
        tokens: readUsageNumber(usage?.input?.tokensCount) + readUsageNumber(usage?.output?.tokensCount),
        priceUsd: readUsageNumber(usage?.price),
        duration: readUsageNumber(usage?.duration),
        humanDuration: usageToWorktime({
            input: createUsageCountsForWorktime(inputWordsCount),
            output: createUsageCountsForWorktime(outputWordsCount),
        }).value,
    };
}

/**
 * Reads a finite usage numeric value with zero fallback.
 */
function readUsageNumber(value: UsageAnalyticsSerializedUncertainNumber | undefined): number {
    const numericValue = value?.value;
    return typeof numericValue === 'number' && Number.isFinite(numericValue) ? numericValue : 0;
}

/**
 * Reads one uncertain number from serialized usage payload.
 */
function readUsageUncertainNumber(value: UsageAnalyticsSerializedUncertainNumber | undefined): { value: number; isUncertain?: true } {
    const numericValue = readUsageNumber(value);
    return value?.isUncertain ? { value: numericValue, isUncertain: true } : { value: numericValue };
}

/**
 * Builds a full usage-count object while preserving uncertainty of words count.
 */
function createUsageCountsForWorktime(wordsCount: { value: number; isUncertain?: true }): UsageAnalyticsCountsForWorktime {
    return {
        tokensCount: { value: 0 },
        charactersCount: { value: 0 },
        wordsCount,
        sentencesCount: { value: 0 },
        linesCount: { value: 0 },
        paragraphsCount: { value: 0 },
        pagesCount: { value: 0 },
    };
}

