/**
 * Represents all the tools needed to interact with the user.
 *
 * @see https://github.com/webgptorg/promptbook#user-interface-tools
 */
export interface UserInterfaceTools {
    /**
     * Asks the user to answer a free-text (multiline) question
     *
     * @param options the question to ask
     * @returns the answer from the user
     */
    promptDialog(options: UserInterfaceToolsPromptDialogOptions): Promise<string>;
}

export interface UserInterfaceToolsPromptDialogOptions {
    /**
     * Prompt message
     *
     * Note: This is not a prompt to language model but a prompt to the user
     */
    prompt: string;

    /**
     * Default value for the input/textarea
     */
    defaultValue: string | null;

    /**
     * Placeholder for the input/textarea
     */
    placeholder?: string;
}
