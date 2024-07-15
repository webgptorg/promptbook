import { spaceTrim } from 'spacetrim';
import { pipelineJsonToString } from '../conversion/pipelineJsonToString';
import { validatePipeline } from '../conversion/validation/validatePipeline';
import { NotFoundError } from '../errors/NotFoundError';
import { ReferenceError } from '../errors/ReferenceError';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { Prompt } from '../types/Prompt';
import type { string_pipeline_url } from '../types/typeAliases';
import type { PipelineCollection } from './PipelineCollection';

/**
 * Library of promptbooks that groups together promptbooks for an application.
 * This implementation is a very thin wrapper around the Array / Map of promptbooks.
 *
 * @private use `createCollectionFromJson` instead
 * @see https://github.com/webgptorg/promptbook#promptbook-collection
 */
export class SimplePipelineCollection implements PipelineCollection {
    private collection: Map<string_pipeline_url, PipelineJson>;

    /**
     * Constructs a pipeline collection from promptbooks
     *
     * @param promptbooks !!!
     *
     * @private Use instead `createCollectionFromJson`
     * Note: During the construction logic of all promptbooks are validated
     * Note: It is not recommended to use this constructor directly, use `createCollectionFromJson` *(or other variant)* instead
     */
    public constructor(...promptbooks: Array<PipelineJson>) {
        this.collection = new Map<string_pipeline_url, PipelineJson>();
        for (const promptbook of promptbooks) {
            if (promptbook.promptbookUrl === undefined) {
                throw new ReferenceError(
                    spaceTrim(`
                        Promptbook with name "${promptbook.title}" does not have defined URL

                        Note: Promptbooks without URLs are called anonymous promptbooks
                              They can be used as standalone promptbooks, but they cannot be referenced by other promptbooks
                              And also they cannot be used in the pipeline collection

                    `),
                );
            }

            validatePipeline(promptbook);

            // Note: [🦄]
            if (
                this.collection.has(promptbook.promptbookUrl) &&
                pipelineJsonToString(promptbook) !==
                    pipelineJsonToString(this.collection.get(promptbook.promptbookUrl)!)
            ) {
                throw new ReferenceError(
                    spaceTrim(`
                        Promptbook with URL "${promptbook.promptbookUrl}" is already in the collection

                        Note: Promptbooks with the same URL are not allowed
                        Note: Automatically check whether the promptbooks are the same BUT they are DIFFERENT

                    `),
                );
            }

            this.collection.set(promptbook.promptbookUrl, promptbook);
        }
    }

    /**
     * Gets all promptbooks in the collection
     */
    public listPipelines(): Array<string_pipeline_url> {
        return Array.from(this.collection.keys());
    }

    /**
     * Gets promptbook by its URL
     *
     * Note: This is not a direct fetching from the URL, but a lookup in the collection
     */
    public getPipelineByUrl(url: string_pipeline_url): PipelineJson {
        const promptbook = this.collection.get(url);
        if (!promptbook) {
            if (this.listPipelines().length === 0) {
                throw new NotFoundError(
                    spaceTrim(
                        `
                            Promptbook with url "${url}" not found

                            No promptbooks available
                        `,
                    ),
                );
            }

            throw new NotFoundError(
                spaceTrim(
                    (block) => `
                        Promptbook with url "${url}" not found

                        Available promptbooks:
                        ${block(
                            this.listPipelines()
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
     * Checks whether given prompt was defined in any promptbook in the collection
     */
    public isResponsibleForPrompt(prompt: Prompt): boolean {
        // TODO: [🍓] !!!  DO not hardcode this, really validate whether the prompt is in the collection
        prompt;
        return true;
    }
}
