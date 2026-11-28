import type { UsageAnalyticsResponse } from '../usageAdmin';
import { UsageAnalyticsAggregationAccumulator } from './UsageAnalyticsAggregationAccumulator';
import { UsageAnalyticsAggregationFormatter } from './UsageAnalyticsAggregationFormatter';
import type {
    UsageAnalyticsCall,
    UsageAnalyticsRequestFilters,
    UsageAnalyticsTimeframe,
} from './UsageAnalyticsModel';

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
 * Response builders for usage analytics.
 *
 * @private function of getUsageAnalyticsResponse
 */
export const UsageAnalyticsAggregation = {
    createEmptyUsageAnalyticsResponse(options: {
        timeframe: UsageAnalyticsTimeframe;
        filters: UsageAnalyticsRequestFilters;
    }): UsageAnalyticsResponse {
        return UsageAnalyticsAggregationFormatter.createEmptyUsageAnalyticsResponse(options);
    },

    createUsageAnalyticsResponse(options: UsageAnalyticsResponseOptions): UsageAnalyticsResponse {
        const { timeframe, filters, filteredCalls, folderById, agentFolderByName, usernamesById, apiKeyNotes } =
            options;
        const aggregationState = UsageAnalyticsAggregationAccumulator.aggregateUsageAnalyticsCalls({
            timeframe,
            filteredCalls,
            agentFolderByName,
        });

        return UsageAnalyticsAggregationFormatter.createUsageAnalyticsResponse({
            timeframe,
            filters,
            aggregationState,
            folderById,
            usernamesById,
            apiKeyNotes,
        });
    },
};
