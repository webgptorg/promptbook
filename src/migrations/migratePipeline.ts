import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { TODO_any } from '../utils/organization/TODO_any';

/**
 * Migrates the pipeline to the latest version
 *
 * Note: Migration does not do heavy lifting like calling the LLMs, just lightweight changes of the structure
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

    let isChanged = false;

    personas = personas.map((persona) => {
        const migratedPersona = { ...persona } as TODO_any; /* <- TODO: [🌪] */

        if (migratedPersona.modelRequirements !== undefined) {
            isChanged = true;
            migratedPersona.modelsRequirements = [migratedPersona.modelRequirements];
            delete migratedPersona.modelRequirements;
        }

        return migratedPersona;
    });

    if (!isChanged) {
        // Note: If nothing to migrate, return the same pipeline
        return deprecatedPipeline;
    }

    const migratedPipeline: PipelineJson = {
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

    console.info(`Book automatically migrated`, { deprecatedPipeline, migratedPipeline });
    // console.info(`Book automatically migrated from ${} -> ${}`, {deprecatedPipeline,migratedPipeline})
    // <- TODO: Report the versions of the migration, DO not migrate backwards, throw `CompatibilityError` when given newer version than current version of the engine and link the NPM + Docker packages

    return migratedPipeline;
}
