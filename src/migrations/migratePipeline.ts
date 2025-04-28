import type { TODO_any } from '../utils/organization/TODO_any';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';

/**
 * Migrates the pipeline to the latest version
 *
 * @public exported from `@promptbook/core`
 */
export function migratePipeline(
    deprecatedPipeline: PipelineJson,
    // <- TODO: [🌪] Make type for deprecated pipelines
): PipelineJson {
    /* eslint-disable prefer-const */
    let {
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
    } = deprecatedPipeline;

    personas = personas.map((persona) => {
        const migratedPersona = { ...persona } as TODO_any; /* <- TODO: [🌪] */

        if (migratedPersona.modelRequirements !== undefined) {
            migratedPersona.modelsRequirements = [migratedPersona.modelRequirements];
            delete migratedPersona.modelRequirements;
        }

        return migratedPersona;
    });

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
        // <- TODO: [🍙] Make some standard order of json properties
    };
}
