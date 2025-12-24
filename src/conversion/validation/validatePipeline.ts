import { spaceTrim } from 'spacetrim';
import { IS_PIPELINE_LOGIC_VALIDATED } from '../../config';
import { LOOP_LIMIT } from '../../config';
import { RESERVED_PARAMETER_NAMES } from '../../constants';
import { ParseError } from '../../errors/ParseError';
import { PipelineLogicError } from '../../errors/PipelineLogicError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { ParameterJson } from '../../pipeline/PipelineJson/ParameterJson';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_name } from '../../types/typeAliases';
import type { string_reserved_parameter_name } from '../../types/typeAliases';
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
 * @private internal function for `validatePipeline`
 */
export function validatePipeline_InnerFunction(pipeline: PipelineJson): void {
    // TODO: [🧠] Maybe test if promptbook is a promise and make specific error case for that

    const pipelineIdentification = (() => {
        // Note: This is a 😐 implementation of [🚞]
        const _: Array<string> = [];

        if (pipeline.sourceFile !== undefined) {
            _.push(`File: ${pipeline.sourceFile}`);
        }

        if (pipeline.pipelineUrl !== undefined) {
            _.push(`Url: ${pipeline.pipelineUrl}`);
        }

        return _.join('\n');
    })();

    if (pipeline.pipelineUrl !== undefined && !isValidPipelineUrl(pipeline.pipelineUrl)) {
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

    if (pipeline.bookVersion !== undefined && !isValidPromptbookVersion(pipeline.bookVersion)) {
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

    // TODO: [🧠] Maybe do here some proper JSON-schema / ZOD checking
    if (!Array.isArray(pipeline.parameters)) {
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

    // TODO: [🧠] Maybe do here some proper JSON-schema / ZOD checking
    if (!Array.isArray(pipeline.tasks)) {
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

    /*
    TODO: [🧠][🅾] Should be empty pipeline valid or not
    // Note: Check that pipeline has some tasks
    if (pipeline.tasks.length === 0) {
        throw new PipelineLogicError(
            spaceTrim(
                (block) => `
                  Pipeline must have at least one task

                  ${block(pipelineIdentification)}
              `,
            ),
        );
    }
    */

    // Note: Check each parameter individually
    for (const parameter of pipeline.parameters) {
        if (parameter.isInput && parameter.isOutput) {
            throw new PipelineLogicError(
                spaceTrim(
                    (block) => `

                        Parameter \`{${(parameter as ParameterJson).name}}\` can not be both input and output

                        ${block(pipelineIdentification)}
                    `,
                ),
                // <- Note: [🆑]
                // <- TODO: [🚞]
            );
        }

        // Note: Testing that parameter is either intermediate or output BUT not created and unused
        if (
            !parameter.isInput &&
            !parameter.isOutput &&
            !pipeline.tasks.some((task) => task.dependentParameterNames.includes(parameter.name))
        ) {
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

        // Note: Testing that parameter is either input or result of some task
        if (!parameter.isInput && !pipeline.tasks.some((task) => task.resultingParameterName === parameter.name)) {
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
    }

    // Note: All input parameters are defined - so that they can be used as result of some task
    const definedParameters: Set<string> = new Set(
        pipeline.parameters.filter(({ isInput }) => isInput).map(({ name }) => name),
    );

    // Note: Checking each task individually
    for (const task of pipeline.tasks) {
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

        if (task.jokerParameterNames && task.jokerParameterNames.length > 0) {
            if (
                !task.format &&
                !task.expectations /* <- TODO: Require at least 1 -> min <- expectation to use jokers */
            ) {
                throw new PipelineLogicError(
                    spaceTrim(
                        (block) => `
                            Joker parameters are used for {${
                                task.resultingParameterName
                            }} but no expectations are defined

                            ${block(pipelineIdentification)}
                        `,
                    ),
                    // <- TODO: [🚞]
                );
            }

            for (const joker of task.jokerParameterNames) {
                if (!task.dependentParameterNames.includes(joker)) {
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
        }

        if (task.expectations) {
            for (const [unit, { min, max }] of Object.entries(task.expectations)) {
                if (min !== undefined && max !== undefined && min > max) {
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

                if (min !== undefined && min < 0) {
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

                if (max !== undefined && max <= 0) {
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
            }
        }
    }

    // Note: Detect circular dependencies
    let resovedParameters: ReadonlyArray<string_name> = pipeline.parameters
        .filter(({ isInput }) => isInput)
        .map(({ name }) => name);

    // Note: All reserved parameters are resolved
    for (const reservedParameterName of RESERVED_PARAMETER_NAMES) {
        resovedParameters = [...resovedParameters, reservedParameterName];
    }

    let unresovedTasks: ReadonlyArray<TaskJson> = [...pipeline.tasks];

    let loopLimit = LOOP_LIMIT;
    while (unresovedTasks.length > 0) {
        if (loopLimit-- < 0) {
            // Note: Really UnexpectedError not LimitReachedError - this should not happen and be caught below
            throw new UnexpectedError(
                spaceTrim(
                    (block) => `
                        Loop limit reached during detection of circular dependencies in \`validatePipeline\`

                        ${block(pipelineIdentification)}
                    `,
                ),
                // <- TODO: [🚞]
            );
        }

        const currentlyResovedTasks = unresovedTasks.filter((task) =>
            task.dependentParameterNames.every((name) => resovedParameters.includes(name)),
        );

        if (currentlyResovedTasks.length === 0) {
            throw new PipelineLogicError(
                // TODO: [🐎] DRY
                spaceTrim(
                    (block) => `

                        Can not resolve some parameters:
                        Either you are using a parameter that is not defined, or there are some circular dependencies.

                        ${block(pipelineIdentification)}

                        **Can not resolve:**
                        ${block(
                            unresovedTasks
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
                            resovedParameters
                                .filter(
                                    (name) =>
                                        !RESERVED_PARAMETER_NAMES.includes(name as string_reserved_parameter_name),
                                )
                                .map((name) => `- Parameter \`{${name}}\``)
                                .join('\n'),
                        )}


                        **Reserved (which are available):**
                        ${block(
                            resovedParameters
                                .filter((name) =>
                                    RESERVED_PARAMETER_NAMES.includes(name as string_reserved_parameter_name),
                                )
                                .map((name) => `- Parameter \`{${name}}\``)
                                .join('\n'),
                        )}


                    `,
                    // <- TODO: [🚞]
                ),
            );
        }

        resovedParameters = [
            ...resovedParameters,
            ...currentlyResovedTasks.map(({ resultingParameterName }) => resultingParameterName),
        ];

        unresovedTasks = unresovedTasks.filter((task) => !currentlyResovedTasks.includes(task));
    }

    // Note: Check that formfactor is corresponding to the pipeline interface
    // TODO: !!6 Implement this
    // pipeline.formfactorName
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

/**
 * TODO: [🧳][main] !!4 Validate that all examples match expectations
 * TODO: [🧳][🐝][main] !!4 Validate that knowledge is valid (non-void)
 * TODO: [🧳][main] !!4 Validate that persona can be used only with CHAT variant
 * TODO: [🧳][main] !!4 Validate that parameter with reserved name not used RESERVED_PARAMETER_NAMES
 * TODO: [🧳][main] !!4 Validate that reserved parameter is not used as joker
 * TODO: [🧠] Validation not only logic itself but imports around - files and websites and rerefenced pipelines exists
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 */
