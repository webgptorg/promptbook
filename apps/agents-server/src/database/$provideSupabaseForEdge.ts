import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AgentsServerDatabase } from './schema';

/**
 * Internal cache for `$provideSupabaseForEdge`
 *
 * @singleton
 *
 * @private
 */
let supabase: SupabaseClient<AgentsServerDatabase>;

/**
 * Get supabase client for the Next.js Edge Runtime (middleware)
 *
 * Note: The client is cached, so it's safe to call this function multiple times
 * Note: This function is intended for use in Edge Runtime environments (e.g., Next.js middleware)
 * where neither Node.js APIs nor browser globals are available.
 * Uses service role key when available, falls back to anon key.
 *
 * @returns instance of supabase client
 *
 * @private internal utility for Edge Runtime Supabase access
 */
export function $provideSupabaseForEdge(): SupabaseClient<AgentsServerDatabase> {
    if (!supabase) {
        supabase = createClient<AgentsServerDatabase>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            },
        );
    }

    return supabase;
}
