import { Promisable } from 'type-fest';
import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';
import { UserInterfaceToolsPromptDialogOptions } from '../../../UserInterfaceTools';

/**
 * Options for CallbackInterfaceTools
 */
export interface CallbackInterfaceToolsOptions extends CommonExecutionToolsOptions {
    /**
     * The callback function to be called when promptDialog is called
     */
    callback(prompt: UserInterfaceToolsPromptDialogOptions): Promisable<string>;
}
