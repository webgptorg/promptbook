import { PipelineJson } from '../_packages/types.index';

/**
 * @@@
 *
 * Note: It is usefull @@@
 *
 * @param pipeline
 * @public exported from `@promptbook/utils`
 */
export function clonePipeline(pipeline: PipelineJson): PipelineJson {
    // Note: Not using spread operator (...) because @@@

    const {
        pipelineUrl,
        sourceFile,
        title,
        promptbookVersion,
        description,
        parameters,
        promptTemplates,
        knowledgeSources,
        knowledgePieces,
        personas,
        preparations,
    } = pipeline;

    return {
        pipelineUrl,
        sourceFile,
        title,
        promptbookVersion,
        description,
        parameters,
        promptTemplates,
        knowledgeSources,
        knowledgePieces,
        personas,
        preparations,
    };
}

/**
 * TODO: [🍙] Make some standart order of json properties
 */
