import { spaceTrim } from 'spacetrim';
import { PromptbookNotFoundError } from '../../errors/PromptbookNotFoundError';
import type { Prompt } from '../../types/Prompt';
import type { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
import type { string_promptbook_url } from '../../types/typeAliases';
import type { PromptbookLibrary } from '../PromptbookLibrary';

/**
 * Creates PromptbookLibrary as a subset of another PromptbookLibrary
 *
 * Note: You can use any type of library as a parent library - local, remote, etc.
 * Note: This is just a thin wrapper / proxy around the parent library
 *
 * @param promptbookSources
 * @returns PromptbookLibrary
 */
export function createPromptbookSublibrary(
    library: PromptbookLibrary,
    predicate: (url: string_promptbook_url) => boolean,
): PromptbookLibrary {
    async function listPromptbooks(): Promise<Array<string_promptbook_url>> {
        let promptbooks = await library.listPromptbooks();
        promptbooks = promptbooks.filter(predicate);
        return promptbooks;
    }
    async function getPromptbookByUrl(url: string_promptbook_url): Promise<PromptbookJson> {
        if (!predicate(url)) {
            throw new PromptbookNotFoundError(
                await spaceTrim(
                    async (block) => `
                        Promptbook with url "${url}" not found or not accessible

                        Available promptbooks:
                        ${block((await listPromptbooks()).map((promptbookUrl) => `- ${promptbookUrl}`).join('\n'))}

                        All available promptbooks in parent library:
                        ${block(
                            (await library.listPromptbooks()).map((promptbookUrl) => `- ${promptbookUrl}`).join('\n'),
                        )}

                    `,
                ),
            );
        }

        const promptbook = await library.getPromptbookByUrl(url);

        return promptbook;
    }
    async function isResponsibleForPrompt(prompt: Prompt): Promise<boolean> {
        const isResponsible = await library.isResponsibleForPrompt(prompt);
        // TODO: !! Only if responsible, check if predicate is true
        return isResponsible;
    }

    return {
        listPromptbooks,
        getPromptbookByUrl,
        isResponsibleForPrompt,
    };
}
