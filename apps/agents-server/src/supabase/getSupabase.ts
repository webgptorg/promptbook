import type { SupabaseClient } from '@supabase/supabase-js';
import { isRunningInBrowser, isRunningInNode, isRunningInWebWorker } from '../isRunningInWhatever';
import { getSupabaseForBrowser } from './getSupabaseForBrowser';
import { getSupabaseForServer } from './getSupabaseForServer';
import { getSupabaseForWorker } from './getSupabaseForWorker';
import type { Database } from './types';

/**
 * Get supabase client in any environment
 *
 * Note: The client is cached, so it's safe to call this function multiple times
 *
 * @returns instance of supabase client
 */
export function getSupabase(): SupabaseClient<Database> {
    if (isRunningInNode()) {
        return getSupabaseForServer();
    } else if (isRunningInBrowser()) {
        return getSupabaseForBrowser();
    } else if (isRunningInWebWorker()) {
        return getSupabaseForWorker();
    } else {
        throw new Error('Unknown environment, cannot determine how to get Supabase client');
    }
}
