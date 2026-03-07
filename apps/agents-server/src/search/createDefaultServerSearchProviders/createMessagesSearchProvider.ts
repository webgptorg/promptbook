import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { defaultServerSearchProviderConfig } from './defaultServerSearchProviderConfig';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';
import { stringifyJsonForSearch } from './stringifyJsonForSearch';

/**
 * Message table row shape used by messages provider.
 *
 * @private function of createDefaultServerSearchProviders
 */
type MessageSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['Message']['Row'],
    'id' | 'createdAt' | 'channel' | 'direction' | 'content' | 'metadata'
>;

/**
 * Creates provider for outbound messages/emails (admin-only).
 *
 * @returns Configured messages search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createMessagesSearchProvider(): ServerSearchProvider {
    return {
        id: 'messages',
        label: 'Messages',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('Message'))
                .select('id, createdAt, channel, direction, content, metadata')
                .order('createdAt', { ascending: false })
                .limit(defaultServerSearchProviderConfig.adminLogLimit);

            if (error) {
                console.error('[search] Failed to load messages:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const message of (data || []) as MessageSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: [
                            message.channel,
                            message.direction,
                            message.content,
                            stringifyJsonForSearch(message.metadata),
                        ].join('\n'),
                        snippetText: message.content,
                        weight: 1.8,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `message-${message.id}`,
                    providerId: 'messages',
                    group: 'Messages',
                    type: 'message',
                    icon: 'message',
                    title: `${message.channel} (${message.direction})`,
                    snippet: match.snippet,
                    href: '/admin/messages',
                    score: match.score + 8,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
