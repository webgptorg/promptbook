import { $isRunningInBrowser } from '@promptbook-local/utils';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AgentsServerDatabase } from './schema';

/**
 * Internal cache for `$provideSupabaseForBrowser`
 *
 * @private
 * @singleton
 */
let supabase: SupabaseClient<AgentsServerDatabase>;

/**
 * Get supabase client
 *
 * Note: The client is cached, so it's safe to call this function multiple times
 * Note: This function is available ONLY in browser, use $provideSupabaseForServer in node
 *
 * @returns instance of supabase client
 */
export function $provideSupabaseForBrowser(): typeof supabase {
    if (!$isRunningInBrowser()) {
        throw new Error(
            'Function `$provideSupabaseForBrowser` can not be used on server or worker, use `$provideSupabaseForServer` or `$provideSupabaseForWorker` instead.',
        );
    }

    if (!supabase) {
        // Create a single supabase client for interacting with your database
        supabase = createClient<AgentsServerDatabase>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
    }

    return supabase;
}

/**
 * Note: [🎇] Promptbook Agents Server is not using Supabase in Browser so maybe remove this file
 */
