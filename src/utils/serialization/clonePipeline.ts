import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';

/**
 * Creates a deep clone of a PipelineJson object, copying all properties explicitly.
 *
 * Note: It is useful for ensuring that modifications to the returned pipeline do not affect the original.
 *
 * @param pipeline The pipeline to clone.
 * @returns A new PipelineJson object with the same properties as the input.
 * @public exported from `@promptbook/utils`
 */
export function clonePipeline(pipeline: PipelineJson): PipelineJson {
    // Note: Not using spread operator (...) because it does not deeply copy nested objects and may miss non-enumerable properties.

    const {
        pipelineUrl,
        sourceFile,
        title,
        bookVersion,
        description,
        formfactorName,
        parameters,
        tasks,
        knowledgeSources,
        knowledgePieces,
        personas,
        preparations,
        sources,
    } = pipeline;

    return {
        pipelineUrl,
        sourceFile,
        title,
        bookVersion,
        description,
        formfactorName,
        parameters,
        tasks,
        knowledgeSources,
        knowledgePieces,
        personas,
        preparations,
        sources,
    };
}

/**
 * TODO: [🍙] Make some standard order of json properties
 */
