import { spaceTrim } from 'spacetrim';
import { IS_PIPELINE_LOGIC_VALIDATED, LOOP_LIMIT } from '../../config';
import { RESERVED_PARAMETER_NAMES } from '../../constants';
import { ParseError } from '../../errors/ParseError';
import { PipelineLogicError } from '../../errors/PipelineLogicError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { ParameterJson } from '../../pipeline/PipelineJson/ParameterJson';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_name, string_reserved_parameter_name } from '../../types/string_name';
import { isValidPromptbookVersion } from '../../utils/validators/semanticVersion/isValidPromptbookVersion';
import { isValidPipelineUrl } from '../../utils/validators/url/isValidPipelineUrl';

/**
 * Validates PipelineJson if it is logically valid
 *
 * It checks:
 * -   if it has correct parameters dependency
 *
 * It does NOT check:
 * -   if it is valid json
 * -   if it is meaningful
 *
 * Note: [🔂] This function is idempotent.
 *
 * @param pipeline valid or invalid PipelineJson
 * @returns the same pipeline if it is logically valid
 * @throws {PipelineLogicError} on logical error in the pipeline
 *
 * @public exported from `@promptbook/core`
 */
export function validatePipeline(pipeline: PipelineJson): PipelineJson {
    if (IS_PIPELINE_LOGIC_VALIDATED) {
        validatePipeline_InnerFunction(pipeline);
    } else {
        try {
            validatePipeline_InnerFunction(pipeline);
        } catch (error) {
            if (!(error instanceof PipelineLogicError)) {
                throw error;
            }

            console.error(
                spaceTrim(
                    (block) => `
                        Pipeline is not valid but logic errors are temporarily disabled via \`IS_PIPELINE_LOGIC_VALIDATED\`

                        ${block((error as PipelineLogicError).message)}
                    `,
                ),
            );
        }
    }

    return pipeline;
}

/**
 * Validates pipeline inner function.
 *
 * @private internal function for `validatePipeline`
 */
export function validatePipeline_InnerFunction(pipeline: PipelineJson): void {
    // TODO: [🧠] Maybe test if promptbook is a promise and make specific error case for that
    const context = createPipelineValidationContext(pipeline);

    validatePipelineMetadata(context);
    validatePipelineCollectionsStructure(context);
    validatePipelineParameters(context);
    validatePipelineTasks(context);
    validatePipelineDependencyResolution(context);

    // Note: Check that formfactor is corresponding to the pipeline interface
    // TODO: !!6 Implement this
    // pipeline.formfactorName
}

/**
 * Shared validation context for one pipeline validation pass.
 *
 * @private type of `validatePipeline`
 */
type PipelineValidationContext = {
    pipeline: PipelineJson;
    pipelineIdentification: string;
};

/**
 * Creates the shared validation context for one pipeline.
 *
 * @private internal utility of `validatePipeline`
 */
function createPipelineValidationContext(pipeline: PipelineJson): PipelineValidationContext {
    return {
        pipeline,
        pipelineIdentification: getPipelineIdentification(pipeline),
    };
}

/**
 * Builds a short file/url identification block for validation errors.
 *
 * @private internal utility of `validatePipeline`
 */
function getPipelineIdentification(pipeline: Pick<PipelineJson, 'sourceFile' | 'pipelineUrl'>): string {
    // Note: This is a 😐 implementation of [🚞]
    const pipelineIdentificationParts: Array<string> = [];

    if (pipeline.sourceFile !== undefined) {
        pipelineIdentificationParts.push(`File: ${pipeline.sourceFile}`);
    }

    if (pipeline.pipelineUrl !== undefined) {
        pipelineIdentificationParts.push(`Url: ${pipeline.pipelineUrl}`);
    }

    return pipelineIdentificationParts.join('\n');
}

/**
 * Validates pipeline-level metadata fields.
 *
 * @private internal step of `validatePipeline`
 */
function validatePipelineMetadata({ pipeline, pipelineIdentification }: PipelineValidationContext): void {
    validatePipelineUrl(pipeline, pipelineIdentification);
    validatePipelineBookVersion(pipeline, pipelineIdentification);
}

/**
 * Validates that the expected top-level collections have array structure.
 *
 * @private internal step of `validatePipeline`
 */
function validatePipelineCollectionsStructure({ pipeline, pipelineIdentification }: PipelineValidationContext): void {
    validatePipelineParametersCollection(pipeline, pipelineIdentification);
    validatePipelineTasksCollection(pipeline, pipelineIdentification);
}

/**
 * Validates all pipeline parameter declarations.
 *
 * @private internal step of `validatePipeline`
 */
function validatePipelineParameters({ pipeline, pipelineIdentification }: PipelineValidationContext): void {
    for (const parameter of pipeline.parameters) {
        validatePipelineParameter(parameter, pipeline, pipelineIdentification);
    }
}

/**
 * Validates all pipeline tasks and their per-task invariants.
 *
 * @private internal step of `validatePipeline`
 */
function validatePipelineTasks({ pipeline, pipelineIdentification }: PipelineValidationContext): void {
    // Note: All input parameters are defined - so that they can be used as result of some task
    const definedParameters = createInitiallyDefinedParameters(pipeline);

    for (const task of pipeline.tasks) {
        validatePipelineTask(task, definedParameters, pipelineIdentification);
    }
}

/**
 * Validates that task dependencies can be resolved without cycles or missing definitions.
 *
 * @private internal step of `validatePipeline`
 */
function validatePipelineDependencyResolution({ pipeline, pipelineIdentification }: PipelineValidationContext): void {
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
 * Validates one pipeline parameter declaration.
 *
 * @private internal step of `validatePipeline`
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
 * Validates one pipeline task and its invariants.
 *
 * @private internal step of `validatePipeline`
 */
function validatePipelineTask(task: TaskJson, definedParameters: Set<string>, pipelineIdentification: string): void {
    validateTaskResultingParameter(task, definedParameters, pipelineIdentification);
    validateTaskJokers(task, pipelineIdentification);
    validateTaskExpectations(task, pipelineIdentification);
}

/**
 * Validates the pipeline URL, when present.
 *
 * @private internal utility of `validatePipeline`
 */
function validatePipelineUrl(pipeline: Pick<PipelineJson, 'pipelineUrl'>, pipelineIdentification: string): void {
    if (pipeline.pipelineUrl === undefined || isValidPipelineUrl(pipeline.pipelineUrl)) {
        return;
    }

    // <- Note: [🚲]
    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Invalid promptbook URL "${pipeline.pipelineUrl}"

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🐠]
        // <- TODO: [🚞]
    );
}

/**
 * Validates the Promptbook version, when present.
 *
 * @private internal utility of `validatePipeline`
 */
function validatePipelineBookVersion(
    pipeline: Pick<PipelineJson, 'bookVersion'>,
    pipelineIdentification: string,
): void {
    if (pipeline.bookVersion === undefined || isValidPromptbookVersion(pipeline.bookVersion)) {
        return;
    }

    // <- Note: [🚲]
    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Invalid Promptbook Version "${pipeline.bookVersion}"

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Validates that `pipeline.parameters` is an array.
 *
 * @private internal utility of `validatePipeline`
 */
function validatePipelineParametersCollection(
    pipeline: Pick<PipelineJson, 'parameters'>,
    pipelineIdentification: string,
): void {
    // TODO: [🧠] Maybe do here some proper JSON-schema / ZOD checking
    if (Array.isArray(pipeline.parameters)) {
        return;
    }

    // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
    throw new ParseError(
        spaceTrim(
            (block) => `
                Pipeline is valid JSON but with wrong structure

                \`PipelineJson.parameters\` expected to be an array, but got ${typeof pipeline.parameters}

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Validates that `pipeline.tasks` is an array.
 *
 * @private internal utility of `validatePipeline`
 */
function validatePipelineTasksCollection(pipeline: Pick<PipelineJson, 'tasks'>, pipelineIdentification: string): void {
    // TODO: [🧠] Maybe do here some proper JSON-schema / ZOD checking
    if (Array.isArray(pipeline.tasks)) {
        return;
    }

    // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
    throw new ParseError(
        spaceTrim(
            (block) => `
                Pipeline is valid JSON but with wrong structure

                \`PipelineJson.tasks\` expected to be an array, but got ${typeof pipeline.tasks}

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Validates that one parameter does not declare incompatible directions.
 *
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
 */
function isParameterUsedByAnyTask(parameter: ParameterJson, tasks: ReadonlyArray<TaskJson>): boolean {
    return tasks.some((task) => task.dependentParameterNames.includes(parameter.name));
}

/**
 * Checks whether one parameter is produced by at least one task.
 *
 * @private internal utility of `validatePipeline`
 */
function isParameterDefinedByAnyTask(parameter: ParameterJson, tasks: ReadonlyArray<TaskJson>): boolean {
    return tasks.some((task) => task.resultingParameterName === parameter.name);
}

/**
 * Collects the parameter names that are already defined before task validation starts.
 *
 * @private internal utility of `validatePipeline`
 */
function createInitiallyDefinedParameters(pipeline: Pick<PipelineJson, 'parameters'>): Set<string> {
    return new Set(pipeline.parameters.filter(({ isInput }) => isInput).map(({ name }) => name));
}

/**
 * Validates one task result parameter declaration and marks it as defined.
 *
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
 */
function hasTaskJokers(task: TaskJson): task is TaskJson & { jokerParameterNames: ReadonlyArray<string_name> } {
    return !!task.jokerParameterNames && task.jokerParameterNames.length > 0;
}

/**
 * Validates that a task has the required supporting features when using jokers.
 *
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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

/**
 * Shared state for one dependency-resolution validation pass.
 *
 * @private type of `validatePipeline`
 */
type PipelineDependencyResolutionState = {
    resolvedParameterNames: ReadonlyArray<string_name>;
    unresolvedTasks: ReadonlyArray<TaskJson>;
};

/**
 * Collects the parameter names that are already resolvable before dependency traversal starts.
 *
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
 */
function hasUnresolvedTasks({ unresolvedTasks }: PipelineDependencyResolutionState): boolean {
    return unresolvedTasks.length > 0;
}

/**
 * Resolves the next batch of currently satisfiable tasks.
 *
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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
 * @private internal utility of `validatePipeline`
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

/**
 * TODO: [🧞‍♀️] Do not allow joker + foreach
 * TODO: [🧠] Work with promptbookVersion
 * TODO: Use here some json-schema, Zod or something similar and change it to:
 *     > /**
 *     >  * Validates PipelineJson if it is logically valid.
 *     >  *
 *     >  * It checks:
 *     >  * -   it has a valid structure
 *     >  * -   ...
 *     >  ex port function validatePipeline(promptbook: really_unknown): asserts promptbook is PipelineJson {
 */

// TODO: [🧳][main] !!4 Validate that all examples match expectations
// TODO: [🧳][🐝][main] !!4 Validate that knowledge is valid (non-void)
// TODO: [🧳][main] !!4 Validate that persona can be used only with CHAT variant
// TODO: [🧳][main] !!4 Validate that parameter with reserved name not used RESERVED_PARAMETER_NAMES
// TODO: [🧳][main] !!4 Validate that reserved parameter is not used as joker
// TODO: [🧠] Validation not only logic itself but imports around - files and websites and rerefenced pipelines exists
// TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
