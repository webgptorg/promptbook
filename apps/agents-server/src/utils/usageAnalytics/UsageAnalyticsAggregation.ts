import type { UsageAnalyticsResponse } from '../usageAdmin';
import {
    UsageAnalyticsModel,
    type UsageAnalyticsAggregate,
    type UsageAnalyticsAggregateWithLastSeen,
    type UsageAnalyticsCall,
    type UsageAnalyticsRequestFilters,
    type UsageAnalyticsTimeframe,
} from './UsageAnalyticsModel';
import { UsageAnalyticsQuery } from './UsageAnalyticsQuery';

/**
 * Full response construction options for usage analytics.
 */
export type UsageAnalyticsResponseOptions = {
    timeframe: UsageAnalyticsTimeframe;
    filters: UsageAnalyticsRequestFilters;
    filteredCalls: UsageAnalyticsCall[];
    folderById: ReadonlyMap<number, { name: string }>;
    agentFolderByName: ReadonlyMap<string, number | null>;
    usernamesById: ReadonlyMap<number, string>;
    apiKeyNotes: ReadonlyMap<string, string | null>;
};

/**
 * Response builders and aggregation helpers for usage analytics.
 * @private function of getUsageAnalyticsResponse
 */
export const UsageAnalyticsAggregation = {
    createEmptyUsageAnalyticsResponse(options: {
        timeframe: UsageAnalyticsTimeframe;
        filters: UsageAnalyticsRequestFilters;
    }): UsageAnalyticsResponse {
        return {
            timeframe: options.timeframe.serialized,
            filters: options.filters,
            summary: {
                totalCalls: 0,
                totalTokens: 0,
                totalPriceUsd: 0,
                totalDuration: 0,
                totalHumanDuration: 0,
                uniqueAgents: 0,
                uniqueUsers: 0,
                uniqueApiKeys: 0,
                uniqueUserAgents: 0,
            },
            timeline: [],
            breakdownByCallType: UsageAnalyticsModel.CALL_TYPES.map((key) => ({
                key,
                label: UsageAnalyticsQuery.callTypeLabel(key),
                calls: 0,
                tokens: 0,
                priceUsd: 0,
                duration: 0,
                humanDuration: 0,
            })),
            breakdownByActorType: UsageAnalyticsModel.ACTOR_TYPES.map((key) => ({
                key,
                label: UsageAnalyticsQuery.actorTypeLabel(key),
                calls: 0,
                tokens: 0,
                priceUsd: 0,
                duration: 0,
                humanDuration: 0,
            })),
            perAgent: [],
            perFolder: [],
            perUser: [],
            apiKeys: [],
            userAgents: [],
        };
    },

    createUsageAnalyticsResponse(options: UsageAnalyticsResponseOptions): UsageAnalyticsResponse {
        const { timeframe, filters, filteredCalls, folderById, agentFolderByName, usernamesById, apiKeyNotes } = options;

        const bucketSizeMs = UsageAnalyticsQuery.resolveTimelineBucketSizeMs(
            timeframe.from.getTime(),
            timeframe.to.getTime(),
        );
        const timelineByBucket = new Map<number, UsageAnalyticsAggregate>();
        const perAgentCounts = new Map<string, UsageAnalyticsAggregate>();
        const perFolderCounts = new Map<number | null, UsageAnalyticsAggregate>();
        const callTypeCounts = new Map<UsageAnalyticsCall['callType'], UsageAnalyticsAggregate>();
        const actorTypeCounts = new Map<UsageAnalyticsCall['actorType'], UsageAnalyticsAggregate>();
        const perUserCounts = new Map<number | null, UsageAnalyticsAggregateWithLastSeen>();
        const apiKeyDetails = new Map<string, UsageAnalyticsAggregateWithLastSeen>();
        const userAgentDetails = new Map<string, UsageAnalyticsAggregateWithLastSeen>();

        for (const call of filteredCalls) {
            const timestamp = Date.parse(call.createdAt);
            if (Number.isNaN(timestamp)) {
                continue;
            }

            const bucketKey = UsageAnalyticsQuery.floorToBucket(timestamp, bucketSizeMs);
            const usageAggregate = {
                tokens: call.tokens || 0,
                priceUsd: call.priceUsd || 0,
                duration: call.duration || 0,
                humanDuration: call.humanDuration || 0,
            };

            timelineByBucket.set(bucketKey, sumUsageAggregate(timelineByBucket.get(bucketKey), usageAggregate));
            perAgentCounts.set(call.agentName, sumUsageAggregate(perAgentCounts.get(call.agentName), usageAggregate));
            callTypeCounts.set(call.callType, sumUsageAggregate(callTypeCounts.get(call.callType), usageAggregate));
            actorTypeCounts.set(call.actorType, sumUsageAggregate(actorTypeCounts.get(call.actorType), usageAggregate));

            const folderId = agentFolderByName.get(call.agentName) ?? null;
            perFolderCounts.set(folderId, sumUsageAggregate(perFolderCounts.get(folderId), usageAggregate));

            const existingUser = perUserCounts.get(call.userId);
            perUserCounts.set(call.userId, {
                calls: (existingUser?.calls || 0) + 1,
                tokens: (existingUser?.tokens || 0) + usageAggregate.tokens,
                priceUsd: (existingUser?.priceUsd || 0) + usageAggregate.priceUsd,
                duration: (existingUser?.duration || 0) + usageAggregate.duration,
                humanDuration: (existingUser?.humanDuration || 0) + usageAggregate.humanDuration,
                lastSeen:
                    existingUser?.lastSeen && existingUser.lastSeen > call.createdAt
                        ? existingUser.lastSeen
                        : call.createdAt,
            });

            if (call.apiKey) {
                const existing = apiKeyDetails.get(call.apiKey);
                apiKeyDetails.set(call.apiKey, {
                    calls: (existing?.calls || 0) + 1,
                    tokens: (existing?.tokens || 0) + usageAggregate.tokens,
                    priceUsd: (existing?.priceUsd || 0) + usageAggregate.priceUsd,
                    duration: (existing?.duration || 0) + usageAggregate.duration,
                    humanDuration: (existing?.humanDuration || 0) + usageAggregate.humanDuration,
                    lastSeen:
                        existing?.lastSeen && existing.lastSeen > call.createdAt ? existing.lastSeen : call.createdAt,
                });
            }

            const existingUserAgent = userAgentDetails.get(call.userAgent);
            userAgentDetails.set(call.userAgent, {
                calls: (existingUserAgent?.calls || 0) + 1,
                tokens: (existingUserAgent?.tokens || 0) + usageAggregate.tokens,
                priceUsd: (existingUserAgent?.priceUsd || 0) + usageAggregate.priceUsd,
                duration: (existingUserAgent?.duration || 0) + usageAggregate.duration,
                humanDuration: (existingUserAgent?.humanDuration || 0) + usageAggregate.humanDuration,
                lastSeen:
                    existingUserAgent?.lastSeen && existingUserAgent.lastSeen > call.createdAt
                        ? existingUserAgent.lastSeen
                        : call.createdAt,
            });
        }

        const timeline = createTimelineSeries({
            from: timeframe.from.getTime(),
            to: timeframe.to.getTime(),
            bucketSizeMs,
            timelineByBucket,
        });

        const perAgent = [...perAgentCounts.entries()]
            .map(([agentName, stats]) => ({ agentName, ...stats }))
            .sort((a, b) => b.calls - a.calls || a.agentName.localeCompare(b.agentName));

        const perFolder = [...perFolderCounts.entries()]
            .map(([folderId, stats]) => ({
                folderId,
                folderName: folderId === null ? 'Root folder' : folderById.get(folderId)?.name || `Folder #${folderId}`,
                ...stats,
            }))
            .sort((a, b) => b.calls - a.calls || a.folderName.localeCompare(b.folderName));

        const perUser = [...perUserCounts.entries()]
            .map(([userId, stats]) => ({
                userId,
                username: resolveUsageUsername(userId, usernamesById),
                ...stats,
            }))
            .sort((a, b) => b.calls - a.calls || b.lastSeen.localeCompare(a.lastSeen));

        const uniqueUserIds = new Set(
            [...perUserCounts.keys()].filter((userId): userId is number => typeof userId === 'number'),
        );

        const apiKeys = [...apiKeyDetails.entries()]
            .map(([apiKey, detail]) => ({
                apiKey,
                note: apiKeyNotes.get(apiKey) || null,
                calls: detail.calls,
                tokens: detail.tokens,
                priceUsd: detail.priceUsd,
                duration: detail.duration,
                humanDuration: detail.humanDuration,
                lastSeen: detail.lastSeen,
            }))
            .sort((a, b) => b.calls - a.calls || b.lastSeen.localeCompare(a.lastSeen));

        const userAgents = [...userAgentDetails.entries()]
            .map(([userAgent, detail]) => ({
                userAgent,
                calls: detail.calls,
                tokens: detail.tokens,
                priceUsd: detail.priceUsd,
                duration: detail.duration,
                humanDuration: detail.humanDuration,
                lastSeen: detail.lastSeen,
            }))
            .sort((a, b) => b.calls - a.calls || b.lastSeen.localeCompare(a.lastSeen));

        return {
            timeframe: timeframe.serialized,
            filters,
            summary: {
                totalCalls: filteredCalls.length,
                totalTokens: filteredCalls.reduce((sum, call) => sum + (call.tokens || 0), 0),
                totalPriceUsd: filteredCalls.reduce((sum, call) => sum + (call.priceUsd || 0), 0),
                totalDuration: filteredCalls.reduce((sum, call) => sum + (call.duration || 0), 0),
                totalHumanDuration: filteredCalls.reduce((sum, call) => sum + (call.humanDuration || 0), 0),
                uniqueAgents: perAgentCounts.size,
                uniqueUsers: uniqueUserIds.size,
                uniqueApiKeys: apiKeyDetails.size,
                uniqueUserAgents: userAgentDetails.size,
            },
            timeline,
            breakdownByCallType: UsageAnalyticsModel.CALL_TYPES.map((key) => {
                const stats = callTypeCounts.get(key) || {
                    calls: 0,
                    tokens: 0,
                    priceUsd: 0,
                    duration: 0,
                    humanDuration: 0,
                };
                return {
                    key,
                    label: UsageAnalyticsQuery.callTypeLabel(key),
                    ...stats,
                };
            }),
            breakdownByActorType: UsageAnalyticsModel.ACTOR_TYPES.map((key) => {
                const stats = actorTypeCounts.get(key) || {
                    calls: 0,
                    tokens: 0,
                    priceUsd: 0,
                    duration: 0,
                    humanDuration: 0,
                };
                return {
                    key,
                    label: UsageAnalyticsQuery.actorTypeLabel(key),
                    ...stats,
                };
            }),
            perAgent,
            perFolder,
            perUser: perUser.slice(0, 25),
            apiKeys: apiKeys.slice(0, 25),
            userAgents: userAgents.slice(0, 25),
        };
    },
};

/**
 * Builds a timeline series with zero-filled buckets.
 */
function createTimelineSeries(options: {
    from: number;
    to: number;
    bucketSizeMs: number;
    timelineByBucket: Map<number, UsageAnalyticsAggregate>;
}): UsageAnalyticsResponse['timeline'] {
    const { from, to, bucketSizeMs, timelineByBucket } = options;
    if (to < from) {
        return [];
    }

    const points: UsageAnalyticsResponse['timeline'] = [];
    const start = UsageAnalyticsQuery.floorToBucket(from, bucketSizeMs);
    const end = UsageAnalyticsQuery.floorToBucket(to, bucketSizeMs);

    for (let cursor = start; cursor <= end; cursor += bucketSizeMs) {
        const bucketVal = timelineByBucket.get(cursor);
        points.push({
            bucketStart: new Date(cursor).toISOString(),
            calls: bucketVal?.calls || 0,
            tokens: bucketVal?.tokens || 0,
            priceUsd: bucketVal?.priceUsd || 0,
            duration: bucketVal?.duration || 0,
            humanDuration: bucketVal?.humanDuration || 0,
        });
    }

    return points;
}

/**
 * Adds one call into an aggregate usage bucket.
 */
function sumUsageAggregate(
    current: UsageAnalyticsAggregate | undefined,
    usage: Omit<UsageAnalyticsAggregate, 'calls'>,
): UsageAnalyticsAggregate {
    return {
        calls: (current?.calls || 0) + 1,
        tokens: (current?.tokens || 0) + usage.tokens,
        priceUsd: (current?.priceUsd || 0) + usage.priceUsd,
        duration: (current?.duration || 0) + usage.duration,
        humanDuration: (current?.humanDuration || 0) + usage.humanDuration,
    };
}

/**
 * Resolves the display name used for one usage user bucket.
 */
function resolveUsageUsername(userId: number | null, usernamesById: ReadonlyMap<number, string>): string {
    if (userId === null) {
        return '(unattributed user)';
    }

    return usernamesById.get(userId) || `User #${userId}`;
}
