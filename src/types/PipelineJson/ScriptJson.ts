import type { ScriptLanguage } from '../ScriptLanguage';
import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';

/**
 * Template for script execution
 */
export interface ScriptJson extends PromptTemplateJsonCommon {
    readonly blockType: 'SCRIPT';

    /**
     * Language of the script
     * - This is required only for blockType SCRIPT
     *
     */
    readonly contentLanguage?: ScriptLanguage;
}
