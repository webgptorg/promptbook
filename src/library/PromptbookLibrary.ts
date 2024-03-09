import { Promisable } from 'type-fest';
import type { Prompt } from '../types/Prompt';
import type { PromptbookJson } from '../types/PromptbookJson/PromptbookJson';
import type { string_promptbook_url } from '../types/typeAliases';

/**
 * Library of promptbooks that groups together promptbooks for an application.
 *
 * @see https://github.com/webgptorg/promptbook#promptbook-library
 */
export type PromptbookLibrary = {
    /**
     * Gets all promptbooks in the library
     */
    listPromptbooks(): Array<string_promptbook_url>;

    /**
     * Gets promptbook by its URL
     *
     * Note: This is not a direct fetching from the URL, but a lookup in the library
     */
    getPromptbookByUrl(url: string_promptbook_url): Promisable<PromptbookJson>;

    /**
     * Checks whether given prompt was defined in any promptbook in the library
     */
    isResponsibleForPrompt(prompt: Prompt): boolean;
};
