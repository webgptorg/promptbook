import type { AgentsServerDatabase } from '../../database/schema';
import type {
    UsageActorType,
    UsageAnalyticsResponse,
    UsageCallType,
    UsageTimeframePreset,
} from '../usageAdmin';

/**
 * One raw chat-history row used by usage analytics.
 */
export type UsageAnalyticsChatHistoryRow = Pick<
    AgentsServerDatabase['public']['Tables']['ChatHistory']['Row'],
    'createdAt' | 'agentName' | 'message' | 'source' | 'apiKey' | 'userAgent' | 'actorType' | 'usage' | 'userId'
>;

/**
 * Aggregated usage metrics tracked for each bucket/group.
 */
export type UsageAnalyticsAggregate = {
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
    humanDuration: number;
};

/**
 * Usage detail entry with recency metadata.
 */
export type UsageAnalyticsAggregateWithLastSeen = UsageAnalyticsAggregate & {
    lastSeen: string;
};

/**
 * Numeric usage counts required by `usageToWorktime`.
 */
export type UsageAnalyticsCountsForWorktime = {
    tokensCount: { value: number; isUncertain?: true };
    charactersCount: { value: number; isUncertain?: true };
    wordsCount: { value: number; isUncertain?: true };
    sentencesCount: { value: number; isUncertain?: true };
    linesCount: { value: number; isUncertain?: true };
    paragraphsCount: { value: number; isUncertain?: true };
    pagesCount: { value: number; isUncertain?: true };
};

/**
 * JSON-serializable uncertain number payload from usage records.
 */
export type UsageAnalyticsSerializedUncertainNumber = {
    value?: number;
    isUncertain?: boolean;
};

/**
 * Minimal usage payload shape read from chat-history JSON.
 */
export type UsageAnalyticsSerializedUsage = {
    input?: {
        tokensCount?: UsageAnalyticsSerializedUncertainNumber;
        wordsCount?: UsageAnalyticsSerializedUncertainNumber;
    };
    output?: {
        tokensCount?: UsageAnalyticsSerializedUncertainNumber;
        wordsCount?: UsageAnalyticsSerializedUncertainNumber;
    };
    price?: UsageAnalyticsSerializedUncertainNumber;
    duration?: UsageAnalyticsSerializedUncertainNumber;
} | null;

/**
 * Validated timeframe payload used by usage analytics.
 */
export type UsageAnalyticsTimeframe = {
    preset: UsageTimeframePreset;
    from: Date;
    to: Date;
    serialized: UsageAnalyticsResponse['timeframe'];
};

/**
 * Parsed request filters used by usage analytics.
 */
export type UsageAnalyticsRequestFilters = {
    agentName: string | null;
    folderId: number | null;
    callType: UsageCallType | null;
    actorType: UsageActorType | null;
};

/**
 * Normalized call data used by analytics aggregation.
 */
export type UsageAnalyticsCall = {
    createdAt: string;
    agentName: string;
    callType: UsageCallType;
    actorType: UsageActorType;
    userId: number | null;
    apiKey: string | null;
    userAgent: string;
    tokens: number;
    priceUsd: number;
    duration: number;
    humanDuration: number;
};

/**
 * Shared constants for usage analytics.
 * @private function of getUsageAnalyticsResponse
 */
export const UsageAnalyticsModel = {
    CALL_TYPES: ['WEB_CHAT', 'VOICE_CHAT', 'COMPATIBLE_API'] as UsageCallType[],
    ACTOR_TYPES: ['ANONYMOUS', 'TEAM_MEMBER', 'API_KEY'] as UsageActorType[],
    DEFAULT_TIMEFRAME_PRESET: '30d' as UsageTimeframePreset,
    CHAT_HISTORY_PAGE_SIZE: 1000,
};

