import type { number_integer, number_positive } from '../types/typeAliases';

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

export type UserInterfaceToolsPromptDialogOptions = {
    /**
     * Prompt title
     *
     * Note: This is not a prompt to language model but a prompt to the user
     * @example "Your name"
     */
    promptTitle: string;

    /**
     * Prompt message
     *
     * Note: This is not a prompt to language model but a prompt to the user
     * @example "Please enter your name, including your last name, title, etc."
     */
    promptMessage: string;

    /**
     * Default value for the input/textarea
     */
    defaultValue: string | null;

    /**
     * Placeholder for the input/textarea
     */
    placeholder?: string;

    /**
     * Priority of the prompt
     *
     * Note: This would be reflected for example into the UI z-index of the prompt modal
     */
    priority: number_integer & number_positive;
};
