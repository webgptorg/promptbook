import type { string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';
import type { LlmToolsOptions } from './LlmToolsOptions';

/**
 * @@@
 *
 * @@@ `LlmToolsMetadata` vs `LlmToolsConfiguration` vs `LlmToolsOptions` (vs `Registered`)
 */
export type LlmToolsConfiguration = Array<
    Registered & {
        /**
         * @@@
         */
        readonly title: string_title;

        /**
         * @@@
         */
        readonly options: LlmToolsOptions;
    }
>;

/**
 * TODO: [🧠][🌰] `title` is redundant BUT maybe allow each provider pass it's own title for tracking purposes
 * TODO: Maybe instead of `LlmToolsConfiguration[number]` make `LlmToolsConfigurationItem`
 * TODO: [®] DRY Register logic
 */
