import { $getTableName } from '../../database/$getTableName';
import { $provideSupabase } from '../../database/$provideSupabase';
import { buildFolderTree, collectDescendantFolderIds } from '../agentOrganization/folderTree';
import { loadAgentOrganizationState } from '../agentOrganization/loadAgentOrganizationState';
import type { AgentOrganizationAgent } from '../agentOrganization/types';
import { UsageAnalyticsModel, type UsageAnalyticsChatHistoryRow } from './UsageAnalyticsModel';

/**
 * Folder and agent scope resolved for usage analytics filtering.
 */
export type UsageAnalyticsOrganizationScope = {
    folderById: ReadonlyMap<number, { name: string }>;
    agentFolderByName: ReadonlyMap<string, number | null>;
    allowedAgentNames: ReadonlySet<string> | null;
};

/**
 * Data loading utilities for usage analytics.
 * @private function of getUsageAnalyticsResponse
 */
export const UsageAnalyticsSource = {
    async loadUsageAnalyticsOrganizationScope(options: {
        requestedAgentName: string | null;
        requestedFolderId: number | null;
    }): Promise<UsageAnalyticsOrganizationScope> {
        const organizationState = await loadAgentOrganizationState({ status: 'ACTIVE', includePrivate: true });
        const folderTree = buildFolderTree(organizationState.folders);
        const allowedAgentNames = resolveAllowedAgentNames({
            requestedAgentName: options.requestedAgentName,
            requestedFolderId: options.requestedFolderId,
            agents: organizationState.agents,
            childrenByParentId: folderTree.childrenByParentId,
        });
        const agentFolderByName = new Map(
            organizationState.agents.map((agent) => [agent.agentName, agent.folderId] as const),
        );

        return {
            folderById: folderTree.folderById,
            agentFolderByName,
            allowedAgentNames,
        };
    },

    async fetchChatHistoryRows(options: {
        fromIso: string;
        toIso: string;
        allowedAgentNames: ReadonlySet<string> | null;
    }): Promise<UsageAnalyticsChatHistoryRow[]> {
        const { fromIso, toIso, allowedAgentNames } = options;
        const supabase = $provideSupabase();
        const tableName = await $getTableName('ChatHistory');
        const rows: UsageAnalyticsChatHistoryRow[] = [];

        for (let offset = 0; ; offset += UsageAnalyticsModel.CHAT_HISTORY_PAGE_SIZE) {
            let query = supabase
                .from(tableName)
                .select('createdAt, agentName, message, source, apiKey, userAgent, actorType, usage, userId')
                .gte('createdAt', fromIso)
                .lte('createdAt', toIso)
                .order('createdAt', { ascending: true });

            if (allowedAgentNames !== null) {
                query = query.in('agentName', [...allowedAgentNames]);
            }

            const { data, error } = await query.range(offset, offset + UsageAnalyticsModel.CHAT_HISTORY_PAGE_SIZE - 1);
            if (error) {
                throw new Error(`Failed to load usage rows: ${error.message}`);
            }

            const pageRows = (data || []) as UsageAnalyticsChatHistoryRow[];
            rows.push(...pageRows);

            if (pageRows.length < UsageAnalyticsModel.CHAT_HISTORY_PAGE_SIZE) {
                break;
            }
        }

        return rows;
    },

    async resolveApiKeyNotes(apiKeys: string[]): Promise<Map<string, string | null>> {
        const notes = new Map<string, string | null>();
        if (apiKeys.length === 0) {
            return notes;
        }

        const supabase = $provideSupabase();
        const tableName = await $getTableName('ApiTokens');
        const { data, error } = await supabase.from(tableName).select('token, note').in('token', apiKeys);

        if (error) {
            console.warn('Usage analytics: failed to resolve API token notes.', error);
            return notes;
        }

        for (const row of (data || []) as Array<{ token: string; note: string | null }>) {
            notes.set(row.token, row.note);
        }

        return notes;
    },

    async resolveUsernamesForIds(userIds: number[]): Promise<Map<number, string>> {
        const usernames = new Map<number, string>();
        if (userIds.length === 0) {
            return usernames;
        }

        const supabase = $provideSupabase();
        const tableName = await $getTableName('User');
        const { data, error } = await supabase.from(tableName).select('id, username').in('id', userIds);

        if (error) {
            console.warn('Usage analytics: failed to resolve usernames for usage rows.', error);
            return usernames;
        }

        for (const row of (data || []) as Array<{ id: number; username: string }>) {
            usernames.set(row.id, row.username);
        }

        return usernames;
    },
};

/**
 * Resolves allowed agent names for the selected scope.
 */
function resolveAllowedAgentNames(options: {
    requestedAgentName: string | null;
    requestedFolderId: number | null;
    agents: AgentOrganizationAgent[];
    childrenByParentId: Map<number | null, number[]>;
}): Set<string> | null {
    const { requestedAgentName, requestedFolderId, agents, childrenByParentId } = options;

    if (requestedAgentName) {
        return new Set([requestedAgentName]);
    }

    if (requestedFolderId === null) {
        return null;
    }

    const descendantIds = new Set(collectDescendantFolderIds(requestedFolderId, childrenByParentId));
    const inFolder = agents
        .filter((agent) => agent.folderId !== null && descendantIds.has(agent.folderId))
        .map((agent) => agent.agentName);
    return new Set(inFolder);
}
