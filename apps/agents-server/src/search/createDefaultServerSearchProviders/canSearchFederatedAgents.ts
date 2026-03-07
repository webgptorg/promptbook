import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';

/**
 * Resolves whether federated search is available for current auth state.
 *
 * @param isAuthenticated Whether requester is authenticated.
 * @returns True when federated search is allowed.
 * @private function of createDefaultServerSearchProviders
 */
export async function canSearchFederatedAgents(isAuthenticated: boolean): Promise<boolean> {
    if (isAuthenticated) {
        return true;
    }

    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Metadata'))
        .select('value')
        .eq('key', 'SHOW_FEDERATED_SERVERS_PUBLICLY')
        .maybeSingle();

    if (error) {
        console.error('[search] Failed to read SHOW_FEDERATED_SERVERS_PUBLICLY:', error);
        return false;
    }

    return (data?.value || '').toLowerCase() === 'true';
}
