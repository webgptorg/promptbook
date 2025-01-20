import type { $PipelineJson } from '../../../commands/_common/types/CommandParser';
import { PipelineLogicError } from '../../../errors/PipelineLogicError';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { string_name } from '../../../types/typeAliases';
import type { TODO_remove_as } from '../../organization/TODO_remove_as';

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
 * Function `renamePipelineParameter` will find all usable parameters for given task
 * In other words, it will find all parameters that are not used in the task itseld and all its dependencies
 *
 * @throws {PipelineLogicError} If the new parameter name is already used in the pipeline
 * @public exported from `@promptbook/editable`
 */
export function renamePipelineParameter(options: RenameParameterOptions): PipelineJson {
    const { pipeline: pipeline, oldParameterName, newParameterName } = options;

    if (pipeline.parameters.some((parameter) => parameter.name === newParameterName)) {
        throw new PipelineLogicError(
            `Can not replace {${oldParameterName}} to {${newParameterName}} because {${newParameterName}} is already used in the pipeline`,
        );
    }

    const renamedPipeline: $PipelineJson = {
        ...(pipeline as TODO_remove_as<$PipelineJson>),
        // <- TODO: [🪓] This should be without `as $PipelineJson`
        parameters: [...pipeline.parameters],
        tasks: [...pipeline.tasks],
    };

    for (const parameter of renamedPipeline.parameters) {
        if (parameter.name !== oldParameterName) {
            continue;
        }
        parameter.name = newParameterName;
    }

    for (const task of renamedPipeline.tasks) {
        if (task.resultingParameterName === oldParameterName) {
            task.resultingParameterName = newParameterName;
        }
        task.dependentParameterNames = task.dependentParameterNames.map((dependentParameterName) =>
            dependentParameterName === oldParameterName ? newParameterName : dependentParameterName,
        );

        task.content = task.content.replace(new RegExp(`{${oldParameterName}}`, 'g'), `{${newParameterName}}`);

        task.title = task.title.replace(new RegExp(`{${oldParameterName}}`, 'g'), `{${newParameterName}}`);

        task.description =
            task.description === undefined
                ? undefined
                : task.description.replace(new RegExp(`{${oldParameterName}}`, 'g'), `{${newParameterName}}`);
    }

    return renamedPipeline as TODO_remove_as<PipelineJson>;
}

/**
 * TODO: Also variant for `edit-pipeline-string`
 */
