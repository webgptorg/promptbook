import type { Prompt } from '../../types/Prompt';
import type { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
import { PromptbookString } from '../../types/PromptbookString';
import type { string_promptbook_url } from '../../types/typeAliases';
import { PromptbookLibrary } from '../PromptbookLibrary';
import { SimplePromptbookLibrary } from '../SimplePromptbookLibrary';
import { createPromptbookLibraryFromSources } from './createPromptbookLibraryFromSources';

export function createPromptbookLibraryFromPromise(
    promptbookSourcesPromiseOrFactory:
        | Promise<Array<PromptbookJson | PromptbookString>>
        | (() => Promise<Array<PromptbookJson | PromptbookString>>),
): PromptbookLibrary {
    let library: SimplePromptbookLibrary;

    async function forSources(): Promise<void> {
        if (typeof promptbookSourcesPromiseOrFactory === 'function') {
            // Note: Calling factory function only once despite multiple calls to resolveSources
            promptbookSourcesPromiseOrFactory = promptbookSourcesPromiseOrFactory();
        }
        const promptbookSources = await promptbookSourcesPromiseOrFactory;
        library = createPromptbookLibraryFromSources(...promptbookSources);
    }

    async function listPromptbooks(): Promise<Array<string_promptbook_url>> {
        await forSources();
        return /* not await */ library.listPromptbooks();
    }
    async function getPromptbookByUrl(url: string_promptbook_url): Promise<PromptbookJson> {
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

/***
 * TODO: !!! Annotate all + all to README and samples
 */
