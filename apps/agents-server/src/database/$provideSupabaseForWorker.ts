import { AgentsDatabaseSchema } from '@promptbook-local/types';
import { $isRunningInWebWorker } from '@promptbook-local/utils';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Internal cache for `$provideSupabaseForWorker`
 *
 * @private
 * @singleton
 */
let supabase: SupabaseClient<AgentsDatabaseSchema>;

/**
 * Get supabase client
 *
 * Note: The client is cached, so it's safe to call this function multiple times
 * Note: This function is available ONLY in worker, use $provideSupabaseForBrowser for main thread
 *
 * @returns instance of supabase client
 */
export function $provideSupabaseForWorker(): typeof supabase {
    if (!$isRunningInWebWorker) {
        throw new Error(
            'Function `$provideSupabaseForWorker` can not be used in browser, use `$provideSupabaseForBrowser` instead.',
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

/**
 * Note: [🎇] Promptbook Agents Server is not using Supabase in Browser so maybe remove this file
 * TODO: Fix> No storage option exists to persist the session, which may result in unexpected behavior when using auth.
              If you want to set persistSession to true, please provide a storage option or you may set persistSession to false to disable this warning.
 */
