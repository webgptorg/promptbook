import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';

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
        templates,
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
        templates,
        knowledgeSources,
        knowledgePieces,
        personas,
        preparations,
    };
}

/**
 * TODO: [🍙] Make some standard order of json properties
 */
