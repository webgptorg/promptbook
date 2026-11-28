import {
    $detectRuntimeEnvironment,
    $isRunningInBrowser,
    $isRunningInNode,
    $isRunningInWebWorker,
} from '@promptbook-local/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import { $provideSupabaseForBrowser } from './$provideSupabaseForBrowser';
import { $provideSupabaseForEdge } from './$provideSupabaseForEdge';
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
    } else if (typeof (globalThis as Record<string, unknown>).EdgeRuntime !== 'undefined') {
        // Note: Next.js middleware runs in Edge Runtime which is not Node, Browser, or Web Worker
        //       The `EdgeRuntime` global is set to `'edge'` in this environment
        return $provideSupabaseForEdge();
    } else {
        console.info($detectRuntimeEnvironment());
        throw new Error('Unknown environment, cannot determine how to get Supabase client');
    }
}

// Note: [🎇] Promptbook Agents Server is not using Supabase in Browser so maybe remove this file
