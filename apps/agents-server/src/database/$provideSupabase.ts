import type { AgentsDatabaseSchema } from '@promptbook-local/types';
import { $isRunningInBrowser, $isRunningInNode, $isRunningInWebWorker } from '@promptbook-local/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseForBrowser } from './getSupabaseForBrowser';
import { getSupabaseForServer } from './getSupabaseForServer';
import { getSupabaseForWorker } from './getSupabaseForWorker';

/**
 * Get supabase client in any environment
 *
 * Note: The client is cached, so it's safe to call this function multiple times
 *
 * @returns instance of supabase client
 */
export function $provideSupabase(): SupabaseClient<AgentsDatabaseSchema> {
    if ($isRunningInNode()) {
        return getSupabaseForServer();
    } else if ($isRunningInBrowser()) {
        return getSupabaseForBrowser();
    } else if ($isRunningInWebWorker()) {
        return getSupabaseForWorker();
    } else {
        throw new Error('Unknown environment, cannot determine how to get Supabase client');
    }
}
