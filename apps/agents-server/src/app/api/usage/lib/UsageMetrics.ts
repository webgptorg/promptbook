import { usageToWorktime } from '@promptbook-local/core';
import { UsageNormalization } from './UsageNormalization';
import type { ChatHistoryRow } from '../ChatHistoryRow';
import type { UsageAggregate } from '../UsageAggregate';
import type { UsageActorType, UsageCallType } from '../../../utils/usageAdmin';

/**
 * @private Helpers that normalize chat history rows into analytics-ready metrics.
 */
export const UsageMetrics = {
    resolveCallType,
    resolveActorType,
    isUserCallRow,
    extractUsageMetrics,
    sumUsageAggregate,
} as const;

/**
 * @private Derives the call channel type from legacy chat history rows.
 */
function resolveCallType(row: ChatHistoryRow): UsageCallType {
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
 * @private Builds a fallback-friendly actor type for older usage rows.
 */
function resolveActorType(row: ChatHistoryRow): UsageActorType {
    if (row.actorType === 'ANONYMOUS' || row.actorType === 'TEAM_MEMBER' || row.actorType === 'API_KEY') {
        return row.actorType;
    }

    if (UsageNormalization.normalizeOptionalText(row.apiKey)) {
        return 'API_KEY';
    }

    if (row.source === 'OPENAI_API_COMPATIBILITY') {
        return 'TEAM_MEMBER';
    }

    return 'ANONYMOUS';
}

/**
 * @private Accepts only user-originated chat rows for usage analytics.
 */
function isUserCallRow(row: ChatHistoryRow): boolean {
    if (!row.message || typeof row.message !== 'object') {
        return false;
    }

    const role = (row.message as { role?: unknown }).role;
    return typeof role === 'string' && role.toUpperCase() === 'USER';
}

/**
 * @private Extracts numeric metrics from the chat history usage payload.
 */
function extractUsageMetrics(rawUsage: ChatHistoryRow['usage']): {
    tokens: number;
    priceUsd: number;
    duration: number;
    humanDuration: number;
} {
    const usage = rawUsage as SerializedUsage;
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
 * @private Converts partial aggregates into a single bucket total.
 */
function sumUsageAggregate(
    current: UsageAggregate | undefined,
    usage: Omit<UsageAggregate, 'calls'>,
): UsageAggregate {
    return {
        calls: (current?.calls || 0) + 1,
        tokens: (current?.tokens || 0) + usage.tokens,
        priceUsd: (current?.priceUsd || 0) + usage.priceUsd,
        duration: (current?.duration || 0) + usage.duration,
        humanDuration: (current?.humanDuration || 0) + usage.humanDuration,
    };
}

/**
 * @private Internal structure describing the counts required by `usageToWorktime`.
 */
type UsageCountsForWorktime = {
    tokensCount: { value: number; isUncertain?: true };
    charactersCount: { value: number; isUncertain?: true };
    wordsCount: { value: number; isUncertain?: true };
    sentencesCount: { value: number; isUncertain?: true };
    linesCount: { value: number; isUncertain?: true };
    paragraphsCount: { value: number; isUncertain?: true };
    pagesCount: { value: number; isUncertain?: true };
};

/**
 * @private Serializable usage payload that might include uncertain counts.
 */
type SerializedUncertainNumber = {
    value?: number;
    isUncertain?: boolean;
};

/**
 * @private Raw usage payload produced by the chat-history ingestion script.
 */
type SerializedUsage = {
    input?: {
        tokensCount?: SerializedUncertainNumber;
        wordsCount?: SerializedUncertainNumber;
    };
    output?: {
        tokensCount?: SerializedUncertainNumber;
        wordsCount?: SerializedUncertainNumber;
    };
    price?: SerializedUncertainNumber;
    duration?: SerializedUncertainNumber;
} | null;

/**
 * @private Reads a finite numeric value, returning zero when the payload is missing or invalid.
 */
function readUsageNumber(value: SerializedUncertainNumber | undefined): number {
    const numericValue = value?.value;
    return typeof numericValue === 'number' && Number.isFinite(numericValue) ? numericValue : 0;
}

/**
 * @private Reads a numeric count that can be marked as uncertain.
 */
function readUsageUncertainNumber(value: SerializedUncertainNumber | undefined): {
    value: number;
    isUncertain?: true;
} {
    const numericValue = readUsageNumber(value);
    return value?.isUncertain ? { value: numericValue, isUncertain: true } : { value: numericValue };
}

/**
 * @private Builds a worktime friendly structure while preserving word-count uncertainty.
 */
function createUsageCountsForWorktime(wordsCount: { value: number; isUncertain?: true }): UsageCountsForWorktime {
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
