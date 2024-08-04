import { PromptTemplateJson } from '../_packages/types.index';
import { forEachAsync, spaceTrim } from '../_packages/utils.index';
import { MAX_PARALLEL_COUNT } from '../config';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import { TODO_USE } from '../utils/organization/TODO_USE';
import type { PrepareOptions } from './PrepareOptions';

type PrepareTemplateInput = Pick<PipelineJson, 'promptTemplates' | 'parameters'> & {
    /**
     * @@@
     */
    readonly knowledgePiecesCount: number;
};

type PreparedTemplates = {
    /**
     * @@@ Sequence of prompt templates that are chained together to form a pipeline
     */
    readonly promptTemplatesPrepared: Array<PromptTemplateJson>;
    // <- TODO: [🧠][🥜]
};

/**
 * @@@
 */
export async function prepareTemplates(
    pipeline: PrepareTemplateInput,
    options: PrepareOptions,
): Promise<PreparedTemplates> {
    const { maxParallelCount = MAX_PARALLEL_COUNT } = options;
    const { promptTemplates, parameters, knowledgePiecesCount } = pipeline;

    // TODO: !!!! Apply samples to each template (if missing and is for the template defined)
    TODO_USE(parameters);

    // TODO: [🦪][🧠] Implement some `mapAsync` function
    const promptTemplatesPrepared: Array<PromptTemplateJson> = new Array(promptTemplates.length);
    await forEachAsync(
        promptTemplates,
        { maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ },
        async (template, index) => {
            let { content } = template;

            if (knowledgePiecesCount > 0) {
                content = spaceTrim(
                    (block) => `
                        ${block(content)}

                        ## Knowledge

                        {knowledge}
                    `,
                    // <- TODO: [🧠][🧻] Cutomize shape/language/formatting of the addition to the prompt
                );
            }

            const preparedTemplate: PromptTemplateJson = {
                ...template,
                content,
            };

            promptTemplatesPrepared[index] = preparedTemplate;
        },
    );

    return { promptTemplatesPrepared };
}

/**
 * TODO: [🧠] Add context to each template (if missing)
 * TODO: [🧠] What is better name `prepareTemplate` or `prepareTemplateAndParameters`
 * TODO: !!!!! Index the samples and maybe templates
 * TODO: [🔼] !!! Export via `@promptbook/core`
 * TODO: Write tests for `preparePipeline`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🧠][🥜]
 */
