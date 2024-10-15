import { TODO_any } from '../../../_packages/types.index';
import type { string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';
import { Scraper } from '../Scraper';

/**
 * @@@
 *
 * @@@ `ScraperMetadata` vs `ScraperConfiguration` vs `ScraperOptions` (vs `Registered`)
 */
export type ScraperMetadata = Registered &
    Pick<Scraper, 'mimeTypes'> & {
        /**
         * @@@
         */
        readonly title: string_title;

        /**
         * @@@
         */
        readonly isAvilableInBrowser: boolean;

        /**
         * @@@
         */
        readonly requiredExecutables: TODO_any;
    };
