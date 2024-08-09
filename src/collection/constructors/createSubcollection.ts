import { spaceTrim } from 'spacetrim';
import { NotFoundError } from '../../errors/NotFoundError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { Prompt } from '../../types/Prompt';
import type { string_pipeline_url } from '../../types/typeAliases';
import type { PipelineCollection } from '../PipelineCollection';

/**
 * Creates PipelineCollection as a subset of another PipelineCollection
 *
 * Note: You can use any type of collection as a parent collection - local, remote, etc.
 * Note: This is just a thin wrapper / proxy around the parent collection
 *
 * @param promptbookSources
 * @returns PipelineCollection
 * @public exported from `@promptbook/core`
 */
export function createSubcollection(
    collection: PipelineCollection,
    predicate: (url: string_pipeline_url) => boolean,
): PipelineCollection {
    async function listPipelines(): Promise<Array<string_pipeline_url>> {
        let promptbooks = await collection.listPipelines();
        promptbooks = promptbooks.filter(predicate);
        return promptbooks;
    }
    async function getPipelineByUrl(url: string_pipeline_url): Promise<PipelineJson> {
        if (!predicate(url)) {
            throw new NotFoundError(
                await spaceTrim(
                    async (block) => `
                        Promptbook with url "${url}" not found or not accessible

                        Available promptbooks:
                        ${block((await listPipelines()).map((pipelineUrl) => `- ${pipelineUrl}`).join('\n'))}

                        All available promptbooks in parent collection:
                        ${block((await collection.listPipelines()).map((pipelineUrl) => `- ${pipelineUrl}`).join('\n'))}

                    `,
                ),
            );
        }

        const pipeline = await collection.getPipelineByUrl(url);

        return pipeline;
    }
    async function isResponsibleForPrompt(prompt: Prompt): Promise<boolean> {
        const isResponsible = await collection.isResponsibleForPrompt(prompt);
        // TODO: !! Only if responsible, check if predicate is true
        return isResponsible;
    }

    return {
        listPipelines,
        getPipelineByUrl,
        isResponsibleForPrompt,
    };
}
