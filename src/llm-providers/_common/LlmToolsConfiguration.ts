import type { TODO_object } from '../../utils/organization/TODO_object';
import type { TODO_string } from '../../utils/organization/TODO_string';

/**
 * @@@
 */
export type LlmToolsConfiguration = Array<{
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
 * TODO: [🧠] Maybe add option for `constructorName` instead of `className`
 */
