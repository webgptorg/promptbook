import { spaceTrim } from 'spacetrim';
import { LOOP_LIMIT } from '../../../config';
import { RESERVED_PARAMETER_NAMES } from '../../../constants';
import { PipelineLogicError } from '../../../errors/PipelineLogicError';
import { UnexpectedError } from '../../../errors/UnexpectedError';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../../pipeline/PipelineJson/TaskJson';
import type { string_name, string_reserved_parameter_name } from '../../../types/string_name';
import type { PipelineValidationContext } from './createPipelineValidationContext';

/**
 * Shared state for one dependency-resolution validation pass.
 *
 * @private type of `validatePipelineDependencyResolution`
 */
type PipelineDependencyResolutionState = {
    resolvedParameterNames: ReadonlyArray<string_name>;
    unresolvedTasks: ReadonlyArray<TaskJson>;
};

/**
 * Validates that task dependencies can be resolved without cycles or missing definitions.
 *
 * @private function of `validatePipeline`
 */
export function validatePipelineDependencyResolution({
    pipeline,
    pipelineIdentification,
}: PipelineValidationContext): void {
    let dependencyResolutionState = createInitialDependencyResolutionState(pipeline);
    let loopLimit = LOOP_LIMIT;

    while (hasUnresolvedTasks(dependencyResolutionState)) {
        if (loopLimit-- < 0) {
            throw createDependencyResolutionLoopLimitError(pipelineIdentification);
        }

        dependencyResolutionState = resolveNextDependencyResolutionState(
            dependencyResolutionState,
            pipelineIdentification,
        );
    }
}

/**
 * Collects the parameter names that are already resolvable before dependency traversal starts.
 *
 * @private internal utility of `validatePipelineDependencyResolution`
 */
function createInitialDependencyResolutionState(
    pipeline: Pick<PipelineJson, 'parameters' | 'tasks'>,
): PipelineDependencyResolutionState {
    return {
        resolvedParameterNames: createInitiallyResolvedParameterNames(pipeline),
        unresolvedTasks: [...pipeline.tasks],
    };
}

/**
 * Checks whether dependency resolution still has tasks left to process.
 *
 * @private internal utility of `validatePipelineDependencyResolution`
 */
function hasUnresolvedTasks({ unresolvedTasks }: PipelineDependencyResolutionState): boolean {
    return unresolvedTasks.length > 0;
}

/**
 * Resolves the next batch of currently satisfiable tasks.
 *
 * @private internal utility of `validatePipelineDependencyResolution`
 */
function resolveNextDependencyResolutionState(
    dependencyResolutionState: PipelineDependencyResolutionState,
    pipelineIdentification: string,
): PipelineDependencyResolutionState {
    const currentlyResolvedTasks = getCurrentlyResolvedTasks(
        dependencyResolutionState.unresolvedTasks,
        dependencyResolutionState.resolvedParameterNames,
    );

    if (currentlyResolvedTasks.length === 0) {
        throw createUnresolvedTasksError(
            dependencyResolutionState.unresolvedTasks,
            dependencyResolutionState.resolvedParameterNames,
            pipelineIdentification,
        );
    }

    return {
        resolvedParameterNames: appendResolvedTaskParameterNames(
            dependencyResolutionState.resolvedParameterNames,
            currentlyResolvedTasks,
        ),
        unresolvedTasks: dependencyResolutionState.unresolvedTasks.filter(
            (task) => !currentlyResolvedTasks.includes(task),
        ),
    };
}

/**
 * Collects the parameter names that are already resolvable before dependency traversal starts.
 *
 * @private internal utility of `validatePipelineDependencyResolution`
 */
function createInitiallyResolvedParameterNames(pipeline: Pick<PipelineJson, 'parameters'>): ReadonlyArray<string_name> {
    let resolvedParameterNames: ReadonlyArray<string_name> = pipeline.parameters
        .filter(({ isInput }) => isInput)
        .map(({ name }) => name);

    for (const reservedParameterName of RESERVED_PARAMETER_NAMES) {
        resolvedParameterNames = [...resolvedParameterNames, reservedParameterName];
    }

    return resolvedParameterNames;
}

/**
 * Adds newly resolved task outputs to the resolved parameter list.
 *
 * @private internal utility of `validatePipelineDependencyResolution`
 */
function appendResolvedTaskParameterNames(
    resolvedParameterNames: ReadonlyArray<string_name>,
    currentlyResolvedTasks: ReadonlyArray<TaskJson>,
): ReadonlyArray<string_name> {
    return [
        ...resolvedParameterNames,
        ...currentlyResolvedTasks.map(({ resultingParameterName }) => resultingParameterName),
    ];
}

/**
 * Selects tasks whose dependencies are already resolved.
 *
 * @private internal utility of `validatePipelineDependencyResolution`
 */
function getCurrentlyResolvedTasks(
    unresolvedTasks: ReadonlyArray<TaskJson>,
    resolvedParameterNames: ReadonlyArray<string_name>,
): ReadonlyArray<TaskJson> {
    return unresolvedTasks.filter((task) =>
        task.dependentParameterNames.every((name) => resolvedParameterNames.includes(name)),
    );
}

/**
 * Creates the unexpected loop-limit error for dependency resolution.
 *
 * @private internal utility of `validatePipelineDependencyResolution`
 */
function createDependencyResolutionLoopLimitError(pipelineIdentification: string): UnexpectedError {
    // Note: Really UnexpectedError not LimitReachedError - this should not happen and be caught below
    return new UnexpectedError(
        spaceTrim(
            (block) => `
                Loop limit reached during detection of circular dependencies in \`validatePipeline\`

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Creates the detailed error for unresolved or circular task dependencies.
 *
 * @private internal utility of `validatePipelineDependencyResolution`
 */
function createUnresolvedTasksError(
    unresolvedTasks: ReadonlyArray<TaskJson>,
    resolvedParameterNames: ReadonlyArray<string_name>,
    pipelineIdentification: string,
): PipelineLogicError {
    return new PipelineLogicError(
        // TODO: [🐎] DRY
        spaceTrim(
            (block) => `

                Can not resolve some parameters:
                Either you are using a parameter that is not defined, or there are some circular dependencies.

                ${block(pipelineIdentification)}

                **Can not resolve:**
                ${block(
                    unresolvedTasks
                        .map(
                            ({ resultingParameterName, dependentParameterNames }) =>
                                `- Parameter \`{${resultingParameterName}}\` which depends on ${dependentParameterNames
                                    .map((dependentParameterName) => `\`{${dependentParameterName}}\``)
                                    .join(' and ')}`,
                        )
                        .join('\n'),
                )}

                **Resolved:**
                ${block(
                    resolvedParameterNames
                        .filter((name) => !RESERVED_PARAMETER_NAMES.includes(name as string_reserved_parameter_name))
                        .map((name) => `- Parameter \`{${name}}\``)
                        .join('\n'),
                )}


                **Reserved (which are available):**
                ${block(
                    resolvedParameterNames
                        .filter((name) => RESERVED_PARAMETER_NAMES.includes(name as string_reserved_parameter_name))
                        .map((name) => `- Parameter \`{${name}}\``)
                        .join('\n'),
                )}


            `,
            // <- TODO: [🚞]
        ),
    );
}
