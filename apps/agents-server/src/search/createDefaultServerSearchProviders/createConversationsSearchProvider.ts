import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { defaultServerSearchProviderConfig } from './defaultServerSearchProviderConfig';
import { extractConversationTitle } from './extractConversationTitle';
import { flattenChatMessagesToText } from './flattenChatMessagesToText';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';
import { toAgentProfile } from './toAgentProfile';

/**
 * User-chat table row shape used by conversations provider.
 *
 * @private function of createDefaultServerSearchProviders
 */
type UserChatSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['UserChat']['Row'],
    'id' | 'updatedAt' | 'lastMessageAt' | 'agentPermanentId' | 'messages'
>;

/**
 * Chat-history table row shape used by conversations provider.
 *
 * @private function of createDefaultServerSearchProviders
 */
type ChatHistorySearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['ChatHistory']['Row'],
    'id' | 'createdAt' | 'agentName' | 'message' | 'url' | 'ip'
>;

/**
 * Minimal agent row shape used for chat-link resolution.
 *
 * @private function of createDefaultServerSearchProviders
 */
type AgentChatLinkRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'agentName' | 'permanentId' | 'agentProfile'
>;

/**
 * Creates provider for conversations (user chats and admin chat history).
 *
 * @returns Configured conversation search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createConversationsSearchProvider(): ServerSearchProvider {
    return {
        id: 'conversations',
        label: 'Conversations',
        async search(context) {
            const userChatResults = await searchUserConversations(context);
            const adminChatResults = await searchAdminConversations(context);
            return sortAndLimitProviderResults(
                [...userChatResults, ...adminChatResults],
                context.limitPerProvider,
            );
        },
    };
}

/**
 * Searches per-user persisted conversations.
 *
 * @param context Provider context.
 * @returns Matching user conversation items.
 * @private function of createDefaultServerSearchProviders
 */
async function searchUserConversations(
    context: Parameters<ServerSearchProvider['search']>[0],
): Promise<ServerSearchResultItem[]> {
    if (!context.currentUser?.id) {
        return [];
    }

    const supabase = $provideSupabaseForServer();
    const userId = context.currentUser.id;
    const [chatResult, agentResult] = await Promise.all([
        supabase
            .from(await $getTableName('UserChat'))
            .select('id, updatedAt, lastMessageAt, agentPermanentId, messages')
            .eq('userId', userId)
            .order('lastMessageAt', { ascending: false, nullsFirst: false })
            .limit(defaultServerSearchProviderConfig.userChatLimit),
        supabase
            .from(await $getTableName('Agent'))
            .select('agentName, permanentId, agentProfile')
            .is('deletedAt', null),
    ]);

    if (chatResult.error) {
        console.error('[search] Failed to load user chats:', chatResult.error);
        return [];
    }
    if (agentResult.error) {
        console.error('[search] Failed to load agents for chat linking:', agentResult.error);
        return [];
    }

    const agentByPermanentId = new Map<string, AgentChatLinkRow>();
    for (const row of (agentResult.data || []) as AgentChatLinkRow[]) {
        if (!row.permanentId) {
            continue;
        }
        agentByPermanentId.set(row.permanentId, row);
    }

    const results: ServerSearchResultItem[] = [];
    for (const chat of (chatResult.data || []) as UserChatSearchRow[]) {
        const relatedAgent = agentByPermanentId.get(chat.agentPermanentId);
        if (!relatedAgent) {
            continue;
        }

        const profile = toAgentProfile(relatedAgent.agentProfile);
        const agentLabel = profile.meta?.fullname || relatedAgent.agentName;
        const messageText = flattenChatMessagesToText(chat.messages);
        const chatTitle = extractConversationTitle(messageText) || `Conversation with ${agentLabel}`;
        const match = createServerSearchMatcher(context.query, [
            {
                text: [agentLabel, relatedAgent.agentName, chatTitle, messageText].join('\n'),
                snippetText: messageText || chatTitle,
                weight: 2.4,
            },
        ]);

        if (!match) {
            continue;
        }

        const routeAgentId = encodeURIComponent(relatedAgent.permanentId || relatedAgent.agentName);
        results.push({
            id: `conversation-user-${chat.id}`,
            providerId: 'conversations',
            group: 'Conversations',
            type: 'user-conversation',
            icon: 'conversation',
            title: chatTitle,
            snippet: match.snippet,
            href: `/agents/${routeAgentId}/chat?chat=${encodeURIComponent(chat.id)}`,
            score: match.score + 22,
        });
    }

    return results;
}

/**
 * Searches admin-visible chat history logs.
 *
 * @param context Provider context.
 * @returns Matching admin conversation items.
 * @private function of createDefaultServerSearchProviders
 */
async function searchAdminConversations(
    context: Parameters<ServerSearchProvider['search']>[0],
): Promise<ServerSearchResultItem[]> {
    if (!context.isAdmin) {
        return [];
    }

    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('ChatHistory'))
        .select('id, createdAt, agentName, message, url, ip')
        .order('createdAt', { ascending: false })
        .limit(defaultServerSearchProviderConfig.adminLogLimit);

    if (error) {
        console.error('[search] Failed to load chat history logs:', error);
        return [];
    }

    const results: ServerSearchResultItem[] = [];
    for (const row of (data || []) as ChatHistorySearchRow[]) {
        const messageText = flattenChatMessagesToText(row.message);
        const match = createServerSearchMatcher(context.query, [
            {
                text: [row.agentName, row.url || '', row.ip || '', messageText].join('\n'),
                snippetText: messageText || row.url || row.ip || row.agentName,
                weight: 1.7,
            },
        ]);
        if (!match) {
            continue;
        }

        results.push({
            id: `conversation-admin-${row.id}`,
            providerId: 'conversations',
            group: 'Conversations',
            type: 'chat-history-log',
            icon: 'conversation',
            title: `Chat log #${row.id} (${row.agentName})`,
            snippet: match.snippet,
            href: `/admin/chat-history?agentName=${encodeURIComponent(row.agentName)}`,
            score: match.score + 6,
        });
    }

    return results;
}
