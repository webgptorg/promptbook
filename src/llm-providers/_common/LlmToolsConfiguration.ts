import type { string_title } from '../../types/typeAliases';
import type { TODO_object } from '../../utils/organization/TODO_object';
import type { TODO_string } from '../../utils/organization/TODO_string';

/**
 * @@@
 */
export type LlmToolsConfiguration = Array<{
    /**
     * @@@
     */
    title: string_title;

    /**
     * @@@
     */
    packageName: TODO_string;

    /**
     * @@@
     */
    className: TODO_string;

    /**
     * @@@
     */
    options: TODO_object;
}>;

/**
 * TODO: [🧠][🌰] `title` is redundant BUT maybe allow each provider pass it's own title for tracking purposes
 * TODO: [🧠] Maybe add option for `constructorName` instead of `className`
 */
