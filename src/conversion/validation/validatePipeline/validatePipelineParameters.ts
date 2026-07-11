import { spaceTrim } from 'spacetrim';
import { PipelineLogicError } from '../../../errors/PipelineLogicError';
import type { ParameterJson } from '../../../pipeline/PipelineJson/ParameterJson';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../../pipeline/PipelineJson/TaskJson';
import type { PipelineValidationContext } from './createPipelineValidationContext';

/**
 * Validates all pipeline parameter declarations.
 *
 * @private function of `validatePipeline`
 */
export function validatePipelineParameters({ pipeline, pipelineIdentification }: PipelineValidationContext): void {
    for (const parameter of pipeline.parameters) {
        validatePipelineParameter(parameter, pipeline, pipelineIdentification);
    }
}

/**
 * Validates one pipeline parameter declaration.
 *
 * @private internal utility of `validatePipelineParameters`
 */
function validatePipelineParameter(
    parameter: ParameterJson,
    pipeline: Pick<PipelineJson, 'tasks'>,
    pipelineIdentification: string,
): void {
    validateParameterDirection(parameter, pipelineIdentification);
    validateParameterUsage(parameter, pipeline, pipelineIdentification);
    validateParameterDefinition(parameter, pipeline, pipelineIdentification);
}

/**
 * Validates that one parameter does not declare incompatible directions.
 *
 * @private internal utility of `validatePipelineParameters`
 */
function validateParameterDirection(parameter: ParameterJson, pipelineIdentification: string): void {
    if (!parameter.isInput || !parameter.isOutput) {
        return;
    }

    const parameterName = (parameter as ParameterJson).name;

    throw new PipelineLogicError(
        spaceTrim(
            (block) => `

                Parameter \`{${parameterName}}\` can not be both input and output

                ${block(pipelineIdentification)}
            `,
        ),
        // <- Note: [🆑]
        // <- TODO: [🚞]
    );
}

/**
 * Validates that one intermediate parameter is actually consumed by at least one task.
 *
 * @private internal utility of `validatePipelineParameters`
 */
function validateParameterUsage(
    parameter: ParameterJson,
    pipeline: Pick<PipelineJson, 'tasks'>,
    pipelineIdentification: string,
): void {
    if (parameter.isInput || parameter.isOutput || isParameterUsedByAnyTask(parameter, pipeline.tasks)) {
        return;
    }

    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Parameter \`{${parameter.name}}\` is created but not used

                You can declare {${parameter.name}} as output parameter by adding in the header:
                - OUTPUT PARAMETER \`{${parameter.name}}\` ${parameter.description || ''}

                ${block(pipelineIdentification)}

            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Validates that one non-input parameter is produced by at least one task.
 *
 * @private internal utility of `validatePipelineParameters`
 */
function validateParameterDefinition(
    parameter: ParameterJson,
    pipeline: Pick<PipelineJson, 'tasks'>,
    pipelineIdentification: string,
): void {
    if (parameter.isInput || isParameterDefinedByAnyTask(parameter, pipeline.tasks)) {
        return;
    }

    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Parameter \`{${parameter.name}}\` is declared but not defined

                You can do one of these:
                1) Remove declaration of \`{${parameter.name}}\`
                2) Add task that results in \`-> {${parameter.name}}\`

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Checks whether one parameter is consumed by at least one task dependency list.
 *
 * @private internal utility of `validatePipelineParameters`
 */
function isParameterUsedByAnyTask(parameter: ParameterJson, tasks: ReadonlyArray<TaskJson>): boolean {
    return tasks.some((task) => task.dependentParameterNames.includes(parameter.name));
}

/**
 * Checks whether one parameter is produced by at least one task.
 *
 * @private internal utility of `validatePipelineParameters`
 */
function isParameterDefinedByAnyTask(parameter: ParameterJson, tasks: ReadonlyArray<TaskJson>): boolean {
    return tasks.some((task) => task.resultingParameterName === parameter.name);
}
