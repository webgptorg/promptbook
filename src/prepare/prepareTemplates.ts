import { spaceTrim } from 'spacetrim';
import { DEFAULT_MAX_PARALLEL_COUNT } from '../config';
import type { ExecutionTools } from '../execution/ExecutionTools';
import { forEachAsync } from '../execution/utils/forEachAsync';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../types/PipelineJson/TemplateJson';
import { TODO_USE } from '../utils/organization/TODO_USE';
import type { PrepareAndScrapeOptions } from './PrepareAndScrapeOptions';

type PrepareTemplateInput = Pick<PipelineJson, 'templates' | 'parameters'> & {
    /**
     * @@@
     */
    readonly knowledgePiecesCount: number;
};

type PreparedTemplates = {
    /**
     * @@@ Sequence of templates that are chained together to form a pipeline
     */
    readonly templatesPrepared: ReadonlyArray<TemplateJson>;
};

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export async function prepareTemplates(
    pipeline: PrepareTemplateInput,
    tools: Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers'>,
    options: PrepareAndScrapeOptions,
): Promise<PreparedTemplates> {
    const { maxParallelCount = DEFAULT_MAX_PARALLEL_COUNT } = options;
    const { templates, parameters, knowledgePiecesCount } = pipeline;

    // TODO: [main] !!!!! Apply samples to each template (if missing and is for the template defined)
    TODO_USE(parameters);

    // TODO: [🖌][🧠] Implement some `mapAsync` function
    const templatesPrepared: Array<TemplateJson> = new Array(templates.length);
    await forEachAsync(
        templates,
        { maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ },
        async (template, index) => {
            let { /* preparedContent <- TODO: Maybe use [🧊] */ dependentParameterNames } = template;
            let preparedContent: string | undefined = undefined;

            if (knowledgePiecesCount > 0 && !dependentParameterNames.includes('knowledge')) {
                preparedContent = spaceTrim(`
                    {content}

                    ## Knowledge

                    {knowledge}
                `);
                // <- TODO: [🧠][🧻] Cutomize shape/language/formatting of the addition to the prompt

                dependentParameterNames = [
                    ...dependentParameterNames,
                    'knowledge',
                    // <- [🏷] There is the reverse process to remove {knowledge} from `dependentParameterNames`
                ];
            }

            const preparedTemplate: TemplateJson = {
                ...template,
                dependentParameterNames,
                preparedContent,
                // <- TODO: [🍙] Make some standard order of json properties
            };

            templatesPrepared[index] = preparedTemplate;
        },
    );

    return { templatesPrepared };
}

/**
 * TODO: [🧠] Add context to each template (if missing)
 * TODO: [🧠] What is better name `prepareTemplate` or `prepareTemplateAndParameters`
 * TODO: [♨][main] !!! Prepare index the samples and maybe templates
 * TODO: Write tests for `preparePipeline`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 */
