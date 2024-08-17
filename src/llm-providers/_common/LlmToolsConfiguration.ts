import type { string_title } from '../../types/typeAliases';
import type { TODO_object } from '../../utils/organization/TODO_object';
import { Registered } from '../../utils/Register';

/**
 * @@@
 */
export type LlmToolsConfiguration = Array<
    Registered & {
        /**
         * @@@
         */
        title: string_title;

        /**
         * @@@
         */
        options: TODO_object;
    }
>;

/**
 * TODO: [🧠][🌰] `title` is redundant BUT maybe allow each provider pass it's own title for tracking purposes
 * TODO: [🧠] Maybe add option for `constructorName` instead of `className`
 */
