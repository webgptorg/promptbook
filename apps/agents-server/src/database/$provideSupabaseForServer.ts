import { $isRunningInNode } from '@promptbook-local/utils';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isAgentsServerPostgresMode, isAgentsServerSqliteMode } from './agentsServerDatabaseMode';
import { $provideLocalPostgresSupabase } from './postgres/$provideLocalPostgresSupabase';
import { $provideLocalSqliteSupabase } from './sqlite/$provideLocalSqliteSupabase';
import { AgentsServerDatabase } from './schema';

/**
 * Internal cache for `$provideSupabaseForServer`
 *
 * @singleton
 *
 * @private
 */
let supabase: SupabaseClient<AgentsServerDatabase>;

/**
 * Get supabase client
 *
 * Note: The client is cached, so it's safe to call this function multiple times
 * Note: This function is available ONLY on server/node, use $provideSupabaseForClient in browser
 *
 * @returns instance of supabase client
 */
export function $provideSupabaseForServer(): SupabaseClient<AgentsServerDatabase> {
    if (!$isRunningInNode()) {
        throw new Error(
            'Function `$provideSupabaseForServer` can not be used in browser, use `$provideSupabaseForBrowser` instead.',
        );
    }

    if (isAgentsServerSqliteMode()) {
        return $provideLocalSqliteSupabase() as SupabaseClient<AgentsServerDatabase>;
    }

    if (isAgentsServerPostgresMode()) {
        return $provideLocalPostgresSupabase() as SupabaseClient<AgentsServerDatabase>;
    }

    if (!supabase) {
        // Create a single supabase client for interacting with your database
        supabase = createClient<AgentsServerDatabase>(
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

// TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
