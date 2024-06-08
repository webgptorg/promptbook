import type { Promisable } from 'type-fest';
import type { CommonExecutionToolsOptions } from './../../../CommonExecutionToolsOptions';
import type { UserInterfaceToolsPromptDialogOptions } from './../../../UserInterfaceTools';

/**
 * Options for CallbackInterfaceTools
 */
export type CallbackInterfaceToolsOptions = CommonExecutionToolsOptions & {
    /**
     * The callback function to be called when promptDialog is called
     */
    callback(prompt: UserInterfaceToolsPromptDialogOptions): Promisable<string>;
};
