import type { CommonToolsOptions } from '../../../../execution/CommonToolsOptions';
import type { PrepareAndScrapeOptions } from '../../../../prepare/PrepareAndScrapeOptions';

export type AgentCollectionInSupabaseOptions = PrepareAndScrapeOptions &
    CommonToolsOptions & {
        /**
         * The Supabase tables prefix to use
         *
         * @default ''
         */
        tablePrefix?: string;
    };
