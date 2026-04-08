import type { CommonToolsOptions } from '../../../../execution/CommonToolsOptions';
import type { PrepareAndScrapeOptions } from '../../../../prepare/PrepareAndScrapeOptions';

/**
 * Options for agent collection in supabase.
 */
export type AgentCollectionInSupabaseOptions = PrepareAndScrapeOptions &
    CommonToolsOptions & {
        /**
         * The Supabase tables prefix to use
         *
         * @default ''
         */
        tablePrefix?: string;
    };
