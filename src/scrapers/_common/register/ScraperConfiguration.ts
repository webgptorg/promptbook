import type { string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';
import type { ScraperOptions } from './ScraperOptions';

/**
 * @@@
 *
 * @@@ `ScraperMetadata` vs `ScraperConfiguration` vs `ScraperOptions` (vs `Registered`)
 */
export type ScraperConfiguration = Array<
    Registered & {
        /**
         * @@@
         */
        title: string_title;

        /**
         * @@@
         */
        options: ScraperOptions;
    }
>;

/**
 * TODO: [🧠][🌰] `title` is redundant BUT maybe allow each provider pass it's own title for tracking purposes
 * TODO: Maybe instead of `ScraperConfiguration[number]` make `ScraperConfigurationItem`
 * TODO: [®] DRY Register logic
 */
