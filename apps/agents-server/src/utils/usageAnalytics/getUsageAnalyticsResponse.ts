import type { UsageAnalyticsResponse } from '../usageAdmin';
import { UsageAnalyticsAggregation } from './UsageAnalyticsAggregation';
import { UsageAnalyticsCallMetrics } from './UsageAnalyticsCallMetrics';
import { UsageAnalyticsQuery } from './UsageAnalyticsQuery';
import { UsageAnalyticsSource } from './UsageAnalyticsSource';

/**
 * Successful usage analytics API result.
 */
type UsageAnalyticsSuccessResult = {
    status: 200;
    response: UsageAnalyticsResponse;
};

/**
 * Invalid usage analytics request result.
 */
type UsageAnalyticsInvalidResult = {
    status: 400;
    error: string;
};

/**
 * Result envelope for usage analytics response creation.
 */
export type GetUsageAnalyticsResponseResult = UsageAnalyticsSuccessResult | UsageAnalyticsInvalidResult;

/**
 * Builds the full usage analytics payload for `/api/usage`.
 * @private function of GET
 */
export async function getUsageAnalyticsResponse(searchParams: URLSearchParams): Promise<GetUsageAnalyticsResponseResult> {
    const queryResult = UsageAnalyticsQuery.parseUsageAnalyticsQuery(searchParams);
    if (!queryResult.isValid) {
        return { status: 400, error: queryResult.error };
    }

    const { timeframe, filters } = queryResult.parsedQuery;
    const organizationScope = await UsageAnalyticsSource.loadUsageAnalyticsOrganizationScope({
        requestedAgentName: filters.agentName,
        requestedFolderId: filters.folderId,
    });

    if (organizationScope.allowedAgentNames !== null && organizationScope.allowedAgentNames.size === 0) {
        return {
            status: 200,
            response: UsageAnalyticsAggregation.createEmptyUsageAnalyticsResponse({
                timeframe,
                filters,
            }),
        };
    }

    const rows = await UsageAnalyticsSource.fetchChatHistoryRows({
        fromIso: timeframe.from.toISOString(),
        toIso: timeframe.to.toISOString(),
        allowedAgentNames: organizationScope.allowedAgentNames,
    });

    const filteredCalls = rows
        .filter((row) => UsageAnalyticsCallMetrics.isUserCallRow(row))
        .map((row) => UsageAnalyticsCallMetrics.toUsageAnalyticsCall(row))
        .filter((call) =>
            UsageAnalyticsCallMetrics.matchesActorTypeAndCallType(call, {
                callType: filters.callType,
                actorType: filters.actorType,
            }),
        );

    const userIds = [
        ...new Set(
            filteredCalls
                .map((call) => call.userId)
                .filter((userId): userId is number => typeof userId === 'number'),
        ),
    ];
    const apiKeys = [
        ...new Set(
            filteredCalls
                .map((call) => call.apiKey)
                .filter((apiKey): apiKey is string => apiKey !== null),
        ),
    ];

    const [usernamesById, apiKeyNotes] = await Promise.all([
        UsageAnalyticsSource.resolveUsernamesForIds(userIds),
        UsageAnalyticsSource.resolveApiKeyNotes(apiKeys),
    ]);

    return {
        status: 200,
        response: UsageAnalyticsAggregation.createUsageAnalyticsResponse({
            timeframe,
            filters,
            filteredCalls,
            folderById: organizationScope.folderById,
            agentFolderByName: organizationScope.agentFolderByName,
            usernamesById,
            apiKeyNotes,
        }),
    };
}
