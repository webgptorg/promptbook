import type { PipelineJson } from '../types/PipelineJson/PipelineJson';

/**
 * Unprepare just strips the preparation data of the pipeline
 */
export function unpreparePipeline(pipeline: PipelineJson): PipelineJson {
    let { personas, knowledgeSources, promptTemplates } = pipeline;

    personas = personas.map((persona) => ({ ...persona, modelRequirements: undefined, preparationIds: undefined }));
    knowledgeSources = knowledgeSources.map((knowledgeSource) => ({ ...knowledgeSource, preparationIds: undefined }));
    promptTemplates = promptTemplates.map((promptTemplate) => ({ ...promptTemplate, preparedContent: undefined }));

    return {
        ...pipeline,
        promptTemplates,
        knowledgeSources,
        knowledgePieces: [],
        personas,
        preparations: [],
    };
}

/**
 * TODO: [🔼] !!! Export via `@promptbook/core`
 * TODO: [🧿] Maybe do same process with same granularity and subfinctions as `preparePipeline`
 * TODO: Write tests for `preparePipeline`
 * TODO: [🍙] Make some standart order of json properties
 * TODO: [🧠][🏷] There should be maybe some reverse process to remove {knowledge} from `dependentParameterNames`
 */
