import { $PipelineJson } from '../../commands/_common/types/CommandParser';
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
 * @public exported from `@promptbook/utils`
 */
export function renameParameter(options: RenameParameterOptions): PipelineJson {
    const { pipeline: pipeline, oldParameterName, newParameterName } = options;

    if (pipeline.parameters.some((parameter) => parameter.name === newParameterName)) {
        throw new PipelineLogicError(
            `Can not replace {${oldParameterName}} to {${newParameterName}} because {${newParameterName}} is already used in the pipeline`,
        );
    }

    const renamedPipeline: $PipelineJson = {
        ...pipeline,
        parameters: [...pipeline.parameters],
        templates: [...pipeline.templates],
    };

    for (const parameter of renamedPipeline.parameters) {
        if (parameter.name !== oldParameterName) {
            continue;
        }
        parameter.name = newParameterName;
    }

    for (const template of renamedPipeline.templates) {
        if (template.resultingParameterName === oldParameterName) {
            template.resultingParameterName = newParameterName;
        }
        template.dependentParameterNames = template.dependentParameterNames.map((dependentParameterName) =>
            dependentParameterName === oldParameterName ? newParameterName : dependentParameterName,
        );

        template.content = template.content.replace(new RegExp(`{${oldParameterName}}`, 'g'), `{${newParameterName}}`);

        template.title = template.title.replace(new RegExp(`{${oldParameterName}}`, 'g'), `{${newParameterName}}`);

        template.description =
            template.description === undefined
                ? undefined
                : template.description.replace(new RegExp(`{${oldParameterName}}`, 'g'), `{${newParameterName}}`);
    }

    return renamedPipeline;
}
