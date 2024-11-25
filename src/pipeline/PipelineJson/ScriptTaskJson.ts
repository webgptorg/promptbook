import type { ScriptLanguage } from '../../types/ScriptLanguage';
import type { CommonTaskJson } from './CommonTaskJson';

/**
 * Task for script execution
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/77
 */
export type ScriptTaskJson = CommonTaskJson & {
    readonly taskType: 'SCRIPT_TASK';

    /**
     * Language of the script
     * - This is required only for taskType SCRIPT
     *
     */
    readonly contentLanguage?: ScriptLanguage;
};

/**
 * TODO: [🍙] Make some standard order of json properties
 */
