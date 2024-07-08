import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { Prompt } from '../../types/Prompt';
import type { string_pipeline_url } from '../../types/typeAliases';
import type { PipelineCollection } from '../PipelineCollection';
import { createCollectionFromJson } from './createCollectionFromJson';

/**
 * Constructs Promptbook from async sources
 * It can be one of the following:
 * - Promise of array of PipelineJson or PipelineString
 * - Factory function that returns Promise of array of PipelineJson or PipelineString
 *
 * Note: This is useful as internal tool for other constructor functions like
 *       `createCollectionFromUrl` or `createCollectionFromDirectory`
 *       Consider using those functions instead of this one
 *
 * Note: The function does NOT return promise it returns the library directly which waits for the sources to be resolved
 *       when error occurs in given promise or factory function, it is thrown during `listPipelines` or `getPipelineByUrl` call
 *
 * Note: Consider using  `createCollectionFromDirectory` or `createCollectionFromUrl`
 *
 * @param promptbookSourcesPromiseOrFactory
 * @returns PipelineCollection
 * @deprecated Do not use, it will became internal tool for other constructor functions
 */
export function createCollectionFromPromise(
    promptbookSourcesPromiseOrFactory: Promise<Array<PipelineJson>> | (() => Promise<Array<PipelineJson>>),
): PipelineCollection {
    let library: PipelineCollection;

    async function forSources(): Promise<void> {
        if (typeof promptbookSourcesPromiseOrFactory === 'function') {
            // Note: Calling factory function only once despite multiple calls to resolveSources
            promptbookSourcesPromiseOrFactory = promptbookSourcesPromiseOrFactory();
        }
        const promptbookSources = await promptbookSourcesPromiseOrFactory;
        library = createCollectionFromJson(...promptbookSources);
    }

    async function listPipelines(): Promise<Array<string_pipeline_url>> {
        await forSources();
        return /* not await */ library.listPipelines();
    }
    async function getPipelineByUrl(url: string_pipeline_url): Promise<PipelineJson> {
        await forSources();
        return /* not await */ library.getPipelineByUrl(url);
    }
    async function isResponsibleForPrompt(prompt: Prompt): Promise<boolean> {
        await forSources();
        return /* not await */ library.isResponsibleForPrompt(prompt);
    }

    return {
        listPipelines,
        getPipelineByUrl,
        isResponsibleForPrompt,
    };
}
