import type { Promisable } from 'type-fest';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { UserInterfaceToolsPromptDialogOptions } from '../../execution/UserInterfaceTools';

/**
 * Options for `CallbackInterfaceTools`
 *
 * @public exported from `@promptbook/core`
 */
export type CallbackInterfaceToolsOptions = CommonToolsOptions & {
    /**
     * The callback function to be called when promptDialog is called
     */
    callback(prompt: UserInterfaceToolsPromptDialogOptions): Promisable<string>;
};
