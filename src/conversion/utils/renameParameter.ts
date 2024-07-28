import type { WritableDeep } from 'type-fest';
import { PipelineLogicError } from '../../errors/PipelineLogicError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { string_name } from '../../types/typeAliases';

type RenameParameterOptions = {
    /**
     * Pipeline to search and replace for parameters
     * This pipeline is returned as copy with replaced parameters
     */
    readonly pipeline: PipelineJson;

    /**
     * Original parameter name that should be replaced
     */
    readonly oldParameterName: string_name;

    /**
     * New parameter name that should replace the original parameter name
     */
    readonly newParameterName: string_name;
};

/**
 * Function renameParameter will find all usable parameters for given prompt template
 * In other words, it will find all parameters that are not used in the prompt template itseld and all its dependencies
 *
 * @throws {PipelineLogicError} If the new parameter name is already used in the pipeline
 */
export function renameParameter(options: RenameParameterOptions): PipelineJson {
    const { pipeline: pipeline, oldParameterName, newParameterName } = options;

    if (pipeline.parameters.some((parameter) => parameter.name === newParameterName)) {
        throw new PipelineLogicError(
            `Can not replace {${oldParameterName}} to {${newParameterName}} because {${newParameterName}} is already used in the pipeline`,
        );
    }

    const renamedPipeline: WritableDeep<PipelineJson> = {
        ...pipeline,
        parameters: [...pipeline.parameters],
        promptTemplates: [...pipeline.promptTemplates],
    };

    for (const parameter of renamedPipeline.parameters) {
        if (parameter.name !== oldParameterName) {
            continue;
        }
        parameter.name = newParameterName;
    }

    for (const promptTemplate of renamedPipeline.promptTemplates) {
        if (promptTemplate.resultingParameterName === oldParameterName) {
            promptTemplate.resultingParameterName = newParameterName;
        }
        promptTemplate.dependentParameterNames = promptTemplate.dependentParameterNames.map((dependentParameterName) =>
            dependentParameterName === oldParameterName ? newParameterName : dependentParameterName,
        );

        promptTemplate.content = promptTemplate.content.replace(
            new RegExp(`{${oldParameterName}}`, 'g'),
            `{${newParameterName}}`,
        );

        promptTemplate.title = promptTemplate.title.replace(
            new RegExp(`{${oldParameterName}}`, 'g'),
            `{${newParameterName}}`,
        );

        promptTemplate.description =
            promptTemplate.description === undefined
                ? undefined
                : promptTemplate.description.replace(new RegExp(`{${oldParameterName}}`, 'g'), `{${newParameterName}}`);
    }

    return renamedPipeline;
}
