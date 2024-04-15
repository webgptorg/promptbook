import spaceTrim from 'spacetrim';
import { validatePromptbookJson } from '../_packages/core.index';
import { PromptbookNotFoundError } from '../errors/PromptbookNotFoundError';
import { PromptbookReferenceError } from '../errors/PromptbookReferenceError';
import type { Prompt } from '../types/Prompt';
import type { PromptbookJson } from '../types/PromptbookJson/PromptbookJson';
import type { string_promptbook_url } from '../types/typeAliases';
import { PromptbookLibrary } from './PromptbookLibrary';

/**
 * Library of promptbooks that groups together promptbooks for an application.
 * This implementation is a very thin wrapper around the Array / Map of promptbooks.
 *
 * @see https://github.com/webgptorg/promptbook#promptbook-library
 */
export class SimplePromptbookLibrary implements PromptbookLibrary {
    private library: Map<string_promptbook_url, PromptbookJson>;

    /**!!!
     *
     * @param promptbooks !!!
     *
     * Note: During the construction logic of all promptbooks are validated
     * Note: It is not recommended to use this constructor directly, use `createPromptbookLibraryFromSources` *(or other variant)* instead
     */
    public constructor(...promptbooks: Array<PromptbookJson>) {
        this.library = new Map<string_promptbook_url, PromptbookJson>();
        for (const promptbook of promptbooks) {
            if (promptbook.promptbookUrl === undefined) {
                throw new PromptbookReferenceError(
                    spaceTrim(`
                        Promptbook with name "${promptbook.title}" does not have defined URL

                        Note: Promptbooks without URLs are called anonymous promptbooks
                              They can be used as standalone promptbooks, but they cannot be referenced by other promptbooks
                              And also they cannot be used in the promptbook library

                    `),
                );
            }

            validatePromptbookJson(promptbook);

            this.library.set(promptbook.promptbookUrl, promptbook);
        }
    }

    /**
     * Gets all promptbooks in the library
     */
    public listPromptbooks(): Array<string_promptbook_url> {
        return Array.from(this.library.keys());
    }

    /**
     * Gets promptbook by its URL
     *
     * Note: This is not a direct fetching from the URL, but a lookup in the library
     */
    public getPromptbookByUrl(url: string_promptbook_url): PromptbookJson {
        const promptbook = this.library.get(url);
        if (!promptbook) {
            throw new PromptbookNotFoundError(
                spaceTrim(
                    (block) => `
                        Promptbook with url "${url}" not found

                        Available promptbooks:
                        ${block(
                            this.listPromptbooks()
                                .map((promptbookUrl) => `- ${promptbookUrl}`)
                                .join('\n'),
                        )}

                    `,
                ),
            );
        }
        return promptbook;
    }

    /**
     * Checks whether given prompt was defined in any promptbook in the library
     */
    public isResponsibleForPrompt(prompt: Prompt): boolean {
        // TODO: !!!  DO not hardcode this, really validate whether the prompt is in the library
        prompt;
        return true;
    }
}
