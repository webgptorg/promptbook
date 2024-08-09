import type { ScriptLanguage } from '../ScriptLanguage';
import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';
/**
 * Template for script execution
 *
 * @see https://github.com/webgptorg/promptbook/discussions/77
 */
export type ScriptJson = PromptTemplateJsonCommon & {
    readonly blockType: 'SCRIPT';
    /**
     * Language of the script
     * - This is required only for blockType SCRIPT
     *
     */
    readonly contentLanguage?: ScriptLanguage;
};
/**
 * TODO: [🍙] Make some standart order of json properties
 */
