import { $isRunningInNode } from '@promptbook-local/utils';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isAgentsServerSqliteMode } from './agentsServerDatabaseMode';
import { $provideLocalSqliteSupabase } from './sqlite/$provideLocalSqliteSupabase';
import { AgentsServerDatabase } from './schema';

/**
 * Hard timeout for every Supabase HTTP request.
 *
 * Without this, a slow or unreachable PostgREST endpoint causes requests to
 * hang indefinitely, eventually making the server appear unresponsive.
 *
 * @private internal constant of Agents Server database layer
 */
const SUPABASE_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Wraps the native `fetch` with a per-request timeout so Supabase queries
 * always resolve (with an error) within `SUPABASE_REQUEST_TIMEOUT_MS`.
 *
 * When the caller already passes an AbortSignal the request is aborted when
 * either that signal fires or the timeout fires — whichever comes first.
 *
 * Uses manual composition instead of `AbortSignal.any` for Node.js 18 compatibility
 * (`AbortSignal.any` is only available in Node.js 20.3+).
 *
 * @private internal helper of Agents Server database layer
 */
function fetchWithSupabaseTimeout(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    const existingSignal = options?.signal instanceof AbortSignal ? options.signal : null;

    if (!existingSignal) {
        return fetch(url, { ...options, signal: AbortSignal.timeout(SUPABASE_REQUEST_TIMEOUT_MS) });
    }

    // Compose the caller signal with the timeout: abort when either fires.
    const controller = new AbortController();
    const abort = () => controller.abort();
    existingSignal.addEventListener('abort', abort, { once: true });
    AbortSignal.timeout(SUPABASE_REQUEST_TIMEOUT_MS).addEventListener('abort', abort, { once: true });

    return fetch(url, { ...options, signal: controller.signal });
}

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
                global: {
                    fetch: fetchWithSupabaseTimeout,
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
