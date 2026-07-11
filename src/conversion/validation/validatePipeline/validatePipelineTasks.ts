import { spaceTrim } from 'spacetrim';
import { RESERVED_PARAMETER_NAMES } from '../../../constants';
import { PipelineLogicError } from '../../../errors/PipelineLogicError';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../../pipeline/PipelineJson/TaskJson';
import type { string_name, string_reserved_parameter_name } from '../../../types/string_name';
import type { PipelineValidationContext } from './createPipelineValidationContext';

/**
 * Validates all pipeline tasks and their per-task invariants.
 *
 * @private function of `validatePipeline`
 */
export function validatePipelineTasks({ pipeline, pipelineIdentification }: PipelineValidationContext): void {
    // Note: All input parameters are defined - so that they can be used as result of some task
    const definedParameters = createInitiallyDefinedParameters(pipeline);

    for (const task of pipeline.tasks) {
        validatePipelineTask(task, definedParameters, pipelineIdentification);
    }
}

/**
 * Collects the parameter names that are already defined before task validation starts.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function createInitiallyDefinedParameters(pipeline: Pick<PipelineJson, 'parameters'>): Set<string> {
    return new Set(pipeline.parameters.filter(({ isInput }) => isInput).map(({ name }) => name));
}

/**
 * Validates one pipeline task and its invariants.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function validatePipelineTask(task: TaskJson, definedParameters: Set<string>, pipelineIdentification: string): void {
    validateTaskResultingParameter(task, definedParameters, pipelineIdentification);
    validateTaskJokers(task, pipelineIdentification);
    validateTaskExpectations(task, pipelineIdentification);
}

/**
 * Validates one task result parameter declaration and marks it as defined.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function validateTaskResultingParameter(
    task: TaskJson,
    definedParameters: Set<string>,
    pipelineIdentification: string,
): void {
    if (definedParameters.has(task.resultingParameterName)) {
        throw new PipelineLogicError(
            spaceTrim(
                (block) => `
                    Parameter \`{${task.resultingParameterName}}\` is defined multiple times

                    ${block(pipelineIdentification)}
                `,
            ),
            // <- TODO: [🚞]
        );
    }

    if (RESERVED_PARAMETER_NAMES.includes(task.resultingParameterName as string_reserved_parameter_name)) {
        throw new PipelineLogicError(
            spaceTrim(
                (block) => `
                    Parameter name {${task.resultingParameterName}} is reserved, please use different name

                    ${block(pipelineIdentification)}
                `,
            ),

            // <- TODO: [🚞]
        );
    }

    definedParameters.add(task.resultingParameterName);
}

/**
 * Validates joker parameters for one task.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function validateTaskJokers(task: TaskJson, pipelineIdentification: string): void {
    if (!hasTaskJokers(task)) {
        return;
    }

    validateTaskSupportsJokers(task, pipelineIdentification);
    validateTaskJokerDependencies(task, pipelineIdentification);
}

/**
 * Checks whether one task declares any joker parameters.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function hasTaskJokers(task: TaskJson): task is TaskJson & { jokerParameterNames: ReadonlyArray<string_name> } {
    return !!task.jokerParameterNames && task.jokerParameterNames.length > 0;
}

/**
 * Validates that a task has the required supporting features when using jokers.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function validateTaskSupportsJokers(task: TaskJson, pipelineIdentification: string): void {
    if (task.format || task.expectations /* <- TODO: Require at least 1 -> min <- expectation to use jokers */) {
        return;
    }

    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Joker parameters are used for {${task.resultingParameterName}} but no expectations are defined

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Validates that every joker parameter is also listed among task dependencies.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function validateTaskJokerDependencies(
    task: TaskJson & { jokerParameterNames: ReadonlyArray<string_name> },
    pipelineIdentification: string,
): void {
    for (const joker of task.jokerParameterNames) {
        if (task.dependentParameterNames.includes(joker)) {
            continue;
        }

        throw new PipelineLogicError(
            spaceTrim(
                (block) => `
                    Parameter \`{${joker}}\` is used for {${
                    task.resultingParameterName
                }} as joker but not in \`dependentParameterNames\`

                    ${block(pipelineIdentification)}
                `,
            ),
            // <- TODO: [🚞]
        );
    }
}

/**
 * Validates all expectation bounds configured on one task.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function validateTaskExpectations(task: TaskJson, pipelineIdentification: string): void {
    if (!task.expectations) {
        return;
    }

    for (const [unit, { min, max }] of Object.entries(task.expectations)) {
        validateTaskExpectationRange(unit, min, max, pipelineIdentification);
        validateTaskExpectationMin(unit, min, pipelineIdentification);
        validateTaskExpectationMax(unit, max, pipelineIdentification);
    }
}

/**
 * Validates the minimum and maximum expectation ordering for one unit.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function validateTaskExpectationRange(
    unit: string,
    min: number | undefined,
    max: number | undefined,
    pipelineIdentification: string,
): void {
    if (min === undefined || max === undefined || min <= max) {
        return;
    }

    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Min expectation (=${min}) of ${unit} is higher than max expectation (=${max})

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Validates the minimum expectation bound for one unit.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function validateTaskExpectationMin(unit: string, min: number | undefined, pipelineIdentification: string): void {
    if (min === undefined || min >= 0) {
        return;
    }

    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Min expectation of ${unit} must be zero or positive

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Validates the maximum expectation bound for one unit.
 *
 * @private internal utility of `validatePipelineTasks`
 */
function validateTaskExpectationMax(unit: string, max: number | undefined, pipelineIdentification: string): void {
    if (max === undefined || max > 0) {
        return;
    }

    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Max expectation of ${unit} must be positive

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}
