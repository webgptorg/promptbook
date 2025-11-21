import { AgentsDatabaseSchema } from '@promptbook-local/types';
import { $isRunningInNode } from '@promptbook-local/utils';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Internal cache for `getSupabaseForServer`
 *
 * @private
 * @singleton
 */
let supabase: SupabaseClient<AgentsDatabaseSchema>;

/**
 * Get supabase client
 *
 * Note: The client is cached, so it's safe to call this function multiple times
 * Note: This function is available ONLY on server/node, use getSupabaseForClient in browser
 *
 * @returns instance of supabase client
 */
export function $provideSupabaseForServer(): typeof supabase {
    if (!$isRunningInNode()) {
        throw new Error(
            'Function `getSupabaseForServer` can not be used in browser, use `getSupabaseForBrowser` instead.',
        );
    }

    if (!supabase) {
        // Create a single supabase client for interacting with your database
        supabase = createClient<AgentsDatabaseSchema>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            },
        );
    }

    /*
    // Access auth admin api
    const adminAuthClient = supabase.auth.admin;
    */

    return supabase;
}
