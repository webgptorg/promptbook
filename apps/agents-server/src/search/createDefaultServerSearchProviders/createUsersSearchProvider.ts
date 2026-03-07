import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';

/**
 * User table row shape used by users provider.
 *
 * @private function of createDefaultServerSearchProviders
 */
type UserSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['User']['Row'],
    'id' | 'username' | 'isAdmin' | 'createdAt'
>;

/**
 * Creates provider for users (admin-only).
 *
 * @returns Configured users search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createUsersSearchProvider(): ServerSearchProvider {
    return {
        id: 'users',
        label: 'Users',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('User'))
                .select('id, username, isAdmin, createdAt')
                .order('username');

            if (error) {
                console.error('[search] Failed to load users:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const user of (data || []) as UserSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: `${user.username} ${user.isAdmin ? 'admin' : 'user'} ${user.createdAt}`,
                        snippetText: `${user.isAdmin ? 'Admin' : 'User'} account`,
                        weight: 2.8,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `user-${user.id}`,
                    providerId: 'users',
                    group: 'Users',
                    type: 'user',
                    icon: 'user',
                    title: user.username,
                    snippet: match.snippet,
                    href: `/admin/users/${encodeURIComponent(user.username)}`,
                    score: match.score + 18,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
