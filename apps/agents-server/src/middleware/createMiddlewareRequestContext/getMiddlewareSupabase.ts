import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cached Supabase client singleton for middleware.
 *
 * @private function of createMiddlewareRequestContext
 */
let cachedMiddlewareSupabase: SupabaseClient | null = null;

/**
 * Returns a shared Supabase client for middleware or `null` when env vars are missing.
 *
 * @returns Shared middleware Supabase client when configured.
 *
 * @private function of createMiddlewareRequestContext
 */
export function getMiddlewareSupabase(): SupabaseClient | null {
    if (cachedMiddlewareSupabase) {
        return cachedMiddlewareSupabase;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    cachedMiddlewareSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    return cachedMiddlewareSupabase;
}
