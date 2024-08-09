import { spaceTrim } from 'spacetrim';
import { pipelineJsonToString } from '../conversion/pipelineJsonToString';
import { validatePipeline } from '../conversion/validation/validatePipeline';
import { NotFoundError } from '../errors/NotFoundError';
import { ReferenceError } from '../errors/ReferenceError';
import { unpreparePipeline } from '../prepare/unpreparePipeline';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { Prompt } from '../types/Prompt';
import type { string_pipeline_url } from '../types/typeAliases';
import type { PipelineCollection } from './PipelineCollection';

/**
 * Library of pipelines that groups together pipelines for an application.
 * This implementation is a very thin wrapper around the Array / Map of pipelines.
 *
 * @private internal function of `createCollectionFromJson`, use `createCollectionFromJson` instead
 * @see https://github.com/webgptorg/pipeline#pipeline-collection
 */
export class SimplePipelineCollection implements PipelineCollection {
    private collection: Map<string_pipeline_url, PipelineJson>;

    /**
     * Constructs a pipeline collection from pipelines
     *
     * @param pipelines @@@
     *
     * Note: During the construction logic of all pipelines are validated
     * Note: It is not recommended to use this constructor directly, use `createCollectionFromJson` *(or other variant)* instead
     */
    public constructor(...pipelines: Array<PipelineJson>) {
        this.collection = new Map<string_pipeline_url, PipelineJson>();
        for (const pipeline of pipelines) {
            // TODO: [👠] DRY
            if (pipeline.pipelineUrl === undefined) {
                throw new ReferenceError(
                    spaceTrim(`
                        Pipeline with name "${pipeline.title}" does not have defined URL

                        File:
                        ${pipeline.sourceFile || 'Unknown'}

                        Note: Pipelines without URLs are called anonymous pipelines
                              They can be used as standalone pipelines, but they cannot be referenced by other pipelines
                              And also they cannot be used in the pipeline collection

                    `),
                );
            }

            // Note: [🐨]
            validatePipeline(pipeline);

            // TODO: [🦄] DRY
            // Note: [🦄]
            if (
                // TODO: [🐽]
                this.collection.has(pipeline.pipelineUrl) &&
                pipelineJsonToString(unpreparePipeline(pipeline)) !==
                    pipelineJsonToString(unpreparePipeline(this.collection.get(pipeline.pipelineUrl)!))
            ) {
                const existing = this.collection.get(pipeline.pipelineUrl)!;

                throw new ReferenceError(
                    spaceTrim(`
                        Pipeline with URL "${pipeline.pipelineUrl}" is already in the collection

                        Conflicting files:
                        ${existing.sourceFile || 'Unknown'}
                        ${pipeline.sourceFile || 'Unknown'}

                        Note: Pipelines with the same URL are not allowed
                              Only exepction is when the pipelines are identical

                    `),
                );
            }

            // Note: [🧠] Overwrite existing pipeline with the same URL
            this.collection.set(pipeline.pipelineUrl, pipeline);
        }
    }

    /**
     * Gets all pipelines in the collection
     */
    public listPipelines(): Array<string_pipeline_url> {
        return Array.from(this.collection.keys());
    }

    /**
     * Gets pipeline by its URL
     *
     * Note: This is not a direct fetching from the URL, but a lookup in the collection
     */
    public getPipelineByUrl(url: string_pipeline_url): PipelineJson {
        const pipeline = this.collection.get(url);
        if (!pipeline) {
            if (this.listPipelines().length === 0) {
                throw new NotFoundError(
                    spaceTrim(
                        `
                            Pipeline with url "${url}" not found

                            No pipelines available
                        `,
                    ),
                );
            }

            throw new NotFoundError(
                spaceTrim(
                    (block) => `
                        Pipeline with url "${url}" not found

                        Available pipelines:
                        ${block(
                            this.listPipelines()
                                .map((pipelineUrl) => `- ${pipelineUrl}`)
                                .join('\n'),
                        )}

                    `,
                ),
            );
        }
        return pipeline;
    }

    /**
     * Checks whether given prompt was defined in any pipeline in the collection
     */
    public isResponsibleForPrompt(prompt: Prompt): boolean {
        // TODO: [🍓] !!!  DO not hardcode this, really validate whether the prompt is in the collection
        prompt;
        return true;
    }
}
