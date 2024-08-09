import type { UserInterfaceTools } from '../../../execution/UserInterfaceTools';
import type { UserInterfaceToolsPromptDialogOptions } from '../../../execution/UserInterfaceTools';
import type { CallbackInterfaceToolsOptions } from './CallbackInterfaceToolsOptions';
/**
 * Delagates the user interaction to a async callback function
 * You need to provide your own implementation of this callback function and its bind to UI.
 *
 * @public exported from `@promptbook/core`
 */
export declare class CallbackInterfaceTools implements UserInterfaceTools {
    private readonly options;
    constructor(options: CallbackInterfaceToolsOptions);
    /**
     * Trigger the custom callback function
     */
    promptDialog(options: UserInterfaceToolsPromptDialogOptions): Promise<string>;
}
