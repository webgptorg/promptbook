import type { number_integer, number_positive } from '../types/number_positive';

/**
 * Represents all the tools needed to interact with the user.
 *
 * @see https://github.com/webgptorg/promptbook#user-interface-tools
 */
export type UserInterfaceTools = {
    /**
     * Asks the user to answer a free-text (multi-line) question
     *
     * @param options the question to ask
     * @returns the answer from the user
     */
    promptDialog(options: UserInterfaceToolsPromptDialogOptions): Promise<string>;
};

/**
 * Options for user interface tools prompt dialog.
 */
export type UserInterfaceToolsPromptDialogOptions = {
    /**
     * Prompt title
     *
     * Note: This is not a prompt to language model but a prompt to the user
     * @example "Your name"
     */
    readonly promptTitle: string;

    /**
     * Prompt message
     *
     * Note: This is not a prompt to language model but a prompt to the user
     * @example "Please enter your name, including your last name, title, etc."
     */
    readonly promptMessage: string;

    /**
     * Default value for the input/textarea
     */
    readonly defaultValue: string | null;

    /**
     * Placeholder for the input/textarea
     */
    readonly placeholder?: string;

    /**
     * Priority of the prompt
     *
     * Note: This would be reflected for example into the UI z-index of the prompt modal
     */
    readonly priority: number_integer & number_positive;
};
