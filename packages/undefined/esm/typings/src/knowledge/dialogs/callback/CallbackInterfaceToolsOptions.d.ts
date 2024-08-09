import type { Promisable } from 'type-fest';
import type { CommonExecutionToolsOptions } from '../../../execution/CommonExecutionToolsOptions';
import type { UserInterfaceToolsPromptDialogOptions } from '../../../execution/UserInterfaceTools';
/**
 * Options for `CallbackInterfaceTools`
 *
 * @public exported from `@promptbook/core`
 */
export type CallbackInterfaceToolsOptions = CommonExecutionToolsOptions & {
    /**
     * The callback function to be called when promptDialog is called
     */
    callback(prompt: UserInterfaceToolsPromptDialogOptions): Promisable<string>;
};
