import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AgentsDatabaseSchema } from '@promptbook-local/types';
import { $isRunningInBrowser } from '@promptbook-local/utils';

/**
 * Internal cache for `getSupabaseForBrowser`
 *
 * @private
 * @singleton
 */
let supabase: SupabaseClient<AgentsDatabaseSchema>;

/**
 * Get supabase client
 *
 * Note: The client is cached, so it's safe to call this function multiple times
 * Note: This function is available ONLY in browser, use getSupabaseForServer in node
 *
 * @returns instance of supabase client
 */
export function $provideSupabaseForBrowser(): typeof supabase {
    if (!$isRunningInBrowser()) {
        throw new Error(
            'Function `getSupabaseForBrowser` can not be used on server or worker, use `getSupabaseForServer` or `getSupabaseForWorker` instead.',
        );
    }

    if (!supabase) {
        // Create a single supabase client for interacting with your database
        supabase = createClient<AgentsDatabaseSchema>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
    }

    return supabase;
}
