import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { Prompt } from '../../types/Prompt';
import type { string_promptbook_url } from '../../types/typeAliases';
import type { PromptbookLibrary } from '../PromptbookLibrary';
import { createLibraryFromJson } from './createLibraryFromJson';

/**
 * Constructs Promptbook from async sources
 * It can be one of the following:
 * - Promise of array of PipelineJson or PipelineString
 * - Factory function that returns Promise of array of PipelineJson or PipelineString
 *
 * Note: This is useful as internal tool for other constructor functions like
 *       `createLibraryFromUrl` or `createLibraryFromDirectory`
 *       Consider using those functions instead of this one
 *
 * Note: The function does NOT return promise it returns the library directly which waits for the sources to be resolved
 *       when error occurs in given promise or factory function, it is thrown during `listPromptbooks` or `getPromptbookByUrl` call
 *
 * Note: Consider using  `createLibraryFromDirectory` or `createLibraryFromUrl`
 *
 * @param promptbookSourcesPromiseOrFactory
 * @returns PromptbookLibrary
 * @deprecated Do not use, it will became internal tool for other constructor functions
 */
export function createLibraryFromPromise(
    promptbookSourcesPromiseOrFactory: Promise<Array<PipelineJson>> | (() => Promise<Array<PipelineJson>>),
): PromptbookLibrary {
    let library: PromptbookLibrary;

    async function forSources(): Promise<void> {
        if (typeof promptbookSourcesPromiseOrFactory === 'function') {
            // Note: Calling factory function only once despite multiple calls to resolveSources
            promptbookSourcesPromiseOrFactory = promptbookSourcesPromiseOrFactory();
        }
        const promptbookSources = await promptbookSourcesPromiseOrFactory;
        library = createLibraryFromJson(...promptbookSources);
    }

    async function listPromptbooks(): Promise<Array<string_promptbook_url>> {
        await forSources();
        return /* not await */ library.listPromptbooks();
    }
    async function getPromptbookByUrl(url: string_promptbook_url): Promise<PipelineJson> {
        await forSources();
        return /* not await */ library.getPromptbookByUrl(url);
    }
    async function isResponsibleForPrompt(prompt: Prompt): Promise<boolean> {
        await forSources();
        return /* not await */ library.isResponsibleForPrompt(prompt);
    }

    return {
        listPromptbooks,
        getPromptbookByUrl,
        isResponsibleForPrompt,
    };
}
