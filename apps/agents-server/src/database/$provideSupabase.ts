import { $isRunningInBrowser, $isRunningInNode, $isRunningInWebWorker } from '@promptbook-local/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import { $provideSupabaseForBrowser } from './$provideSupabaseForBrowser';
import { $provideSupabaseForServer } from './$provideSupabaseForServer';
import { $provideSupabaseForWorker } from './$provideSupabaseForWorker';
import { AgentsServerDatabase } from './schema';

/**
 * Get supabase client in any environment
 *
 * Note: The client is cached, so it's safe to call this function multiple times
 *
 * @returns instance of supabase client
 */
export function $provideSupabase(): SupabaseClient<AgentsServerDatabase> {
    if ($isRunningInNode()) {
        return $provideSupabaseForServer();
    } else if ($isRunningInBrowser()) {
        return $provideSupabaseForBrowser();
    } else if ($isRunningInWebWorker()) {
        return $provideSupabaseForWorker();
    } else {
        throw new Error('Unknown environment, cannot determine how to get Supabase client');
    }
}

/**
 * Note: [🎇] Promptbook Agents Server is not using Supabase in Browser so maybe remove this file
 */
