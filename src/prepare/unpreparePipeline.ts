import { ORDER_OF_PIPELINE_JSON } from '../constants';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import { extractParameterNames } from '../utils/parameters/extractParameterNames';
import { exportJson } from '../utils/serialization/exportJson';

/**
 * Unprepare just strips the preparation data of the pipeline
 *
 * @deprecated In future version this function will be removed or deprecated
 * @public exported from `@promptbook/core`
 */
export function unpreparePipeline(pipeline: PipelineJson): PipelineJson {
    let { personas, knowledgeSources, tasks } = pipeline;

    personas = personas.map((persona) => ({ ...persona, modelsRequirements: undefined, preparationIds: undefined }));
    knowledgeSources = knowledgeSources.map((knowledgeSource) => ({ ...knowledgeSource, preparationIds: undefined }));
    tasks = tasks.map((task) => {
        let { dependentParameterNames } = task;

        const parameterNames = extractParameterNames(task.preparedContent || '');

        dependentParameterNames = dependentParameterNames.filter(
            (dependentParameterName) => !parameterNames.has(dependentParameterName),
            // <- [🏷] This is the reverse process to remove {knowledge} from `dependentParameterNames`
        );

        const taskUnprepared = { ...task, dependentParameterNames };
        delete taskUnprepared.preparedContent;

        return taskUnprepared;
    });

    return exportJson({
        name: 'pipelineJson',
        message: `Result of \`unpreparePipeline\``,
        order: ORDER_OF_PIPELINE_JSON,
        value: {
            ...pipeline,
            tasks,
            knowledgeSources,
            knowledgePieces: [],
            personas,
            preparations: [],
        },
    });
}

/**
 * TODO: [🧿] Maybe do same process with same granularity and subfinctions as `preparePipeline`
 * TODO: Write tests for `preparePipeline`
 * TODO: [🍙] Make some standard order of json properties
 */
