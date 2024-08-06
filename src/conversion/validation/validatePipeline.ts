import { spaceTrim } from 'spacetrim';
import { LOOP_LIMIT } from '../../config';
import { RESERVED_PARAMETER_NAMES } from '../../config';
import { ParsingError } from '../../errors/ParsingError';
import { PipelineLogicError } from '../../errors/PipelineLogicError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
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
 * @param pipeline valid or invalid PipelineJson
 * @returns the same pipeline if it is logically valid
 * @throws {PipelineLogicError} on logical error in the pipeline
 */
export function validatePipeline(pipeline: PipelineJson): PipelineJson {
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

    if (!isValidPromptbookVersion(pipeline.promptbookVersion)) {
        // <- Note: [🚲]
        throw new PipelineLogicError(
            spaceTrim(
                (block) => `
                    Invalid Promptbook Version "${pipeline.promptbookVersion}"

                    ${block(pipelineIdentification)}
                `,
            ),
            // <- TODO: [🚞]
        );
    }

    // TODO: [🧠] Maybe do here some propper JSON-schema / ZOD checking
    if (!Array.isArray(pipeline.parameters)) {
        // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
        throw new ParsingError(
            spaceTrim(
                (block) => `
                    Promptbook is valid JSON but with wrong structure

                    \`promptbook.parameters\` expected to be an array, but got ${typeof pipeline.parameters}

                    ${block(pipelineIdentification)}
                `,
            ),
            // <- TODO: [🚞]
        );
    }

    // TODO: [🧠] Maybe do here some propper JSON-schema / ZOD checking
    if (!Array.isArray(pipeline.promptTemplates)) {
        // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
        throw new ParsingError(
            spaceTrim(
                (block) => `
                    Promptbook is valid JSON but with wrong structure

                    \`promptbook.promptTemplates\` expected to be an array, but got ${typeof pipeline.promptTemplates}

                    ${block(pipelineIdentification)}
                `,
            ),
            // <- TODO: [🚞]
        );
    }

    // Note: Check each parameter individually
    for (const parameter of pipeline.parameters) {
        if (parameter.isInput && parameter.isOutput) {
            throw new PipelineLogicError(
                spaceTrim(
                    (block) => `

                        Parameter {${parameter.name}} can not be both input and output

                        ${block(pipelineIdentification)}
                    `,
                ),
                // <- TODO: [🚞]
            );
        }

        // Note: Testing that parameter is either intermediate or output BUT not created and unused
        if (
            !parameter.isInput &&
            !parameter.isOutput &&
            !pipeline.promptTemplates.some((template) => template.dependentParameterNames.includes(parameter.name))
        ) {
            throw new PipelineLogicError(
                spaceTrim(
                    (block) => `
                        Parameter {${parameter.name}} is created but not used

                        You can declare {${parameter.name}} as output parameter by adding in the header:
                        - OUTPUT PARAMETER \`{${parameter.name}}\` ${parameter.description || ''}

                        ${block(pipelineIdentification)}

                    `,
                ),
                // <- TODO: [🚞]
            );
        }

        // Note: Testing that parameter is either input or result of some template
        if (
            !parameter.isInput &&
            !pipeline.promptTemplates.some((template) => template.resultingParameterName === parameter.name)
        ) {
            throw new PipelineLogicError(
                spaceTrim(
                    (block) => `
                        Parameter {${parameter.name}} is declared but not defined

                        You can do one of these:
                        - Remove declaration of {${parameter.name}}
                        - Add prompt template that results in -> {${parameter.name}}

                        ${block(pipelineIdentification)}
                    `,
                ),
                // <- TODO: [🚞]
            );
        }
    }

    // Note: All input parameters are defined - so that they can be used as result of some template
    const definedParameters: Set<string> = new Set(
        pipeline.parameters.filter(({ isInput }) => isInput).map(({ name }) => name),
    );

    // Note: Checking each template individually
    for (const template of pipeline.promptTemplates) {
        if (definedParameters.has(template.resultingParameterName)) {
            throw new PipelineLogicError(
                spaceTrim(
                    (block) => `
                        Parameter {${template.resultingParameterName}} is defined multiple times
                    `,
                ),
                // <- TODO: [🚞]
            );
        }

        if (RESERVED_PARAMETER_NAMES.includes(template.resultingParameterName as string_reserved_parameter_name)) {
            throw new PipelineLogicError(
                spaceTrim(
                    (block) => `
                        Parameter name {${template.resultingParameterName}} is reserved, please use different name

                        ${block(pipelineIdentification)}
                    `,
                ),

                // <- TODO: [🚞]
            );
        }

        definedParameters.add(template.resultingParameterName);

        if (template.blockType === 'PROMPT_TEMPLATE' && template.modelRequirements.modelVariant === undefined) {
            throw new PipelineLogicError(
                spaceTrim(
                    (block) => `

                        You must specify MODEL VARIANT in the prompt template "${template.title}"

                        For example:
                        - MODEL VARIANT Chat
                        - MODEL NAME \`gpt-4-1106-preview\`${/* <- TODO: Dynamic listing of command examples */ ''}

                        ${block(pipelineIdentification)}
                    `,
                ),
                // <- TODO: [🚞]
            );
        }

        if (template.jokerParameterNames && template.jokerParameterNames.length > 0) {
            if (
                !template.expectFormat &&
                !template.expectations /* <- TODO: Require at least 1 -> min <- expectation to use jokers */
            ) {
                throw new PipelineLogicError(
                    spaceTrim(
                        (block) => `
                            Joker parameters are used for {${
                                template.resultingParameterName
                            }} but no expectations are defined

                            ${block(pipelineIdentification)}
                        `,
                    ),
                    // <- TODO: [🚞]
                );
            }

            for (const joker of template.jokerParameterNames) {
                if (!template.dependentParameterNames.includes(joker)) {
                    throw new PipelineLogicError(
                        spaceTrim(
                            (block) => `
                                Parameter {${joker}} is used for {${
                                template.resultingParameterName
                            }} as joker but not in \`dependentParameterNames\`

                                ${block(pipelineIdentification)}
                            `,
                        ),
                        // <- TODO: [🚞]
                    );
                }
            }
        }

        if (template.expectations) {
            for (const [unit, { min, max }] of Object.entries(template.expectations)) {
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
    let resovedParameters: Array<string_name> = pipeline.parameters
        .filter(({ isInput }) => isInput)
        .map(({ name }) => name);

    // Note: All reserved parameters are resolved
    for (const reservedParameterName of RESERVED_PARAMETER_NAMES) {
        resovedParameters = [...resovedParameters, reservedParameterName];
    }

    let unresovedTemplates: Array<PromptTemplateJson> = [...pipeline.promptTemplates];
    //            <- TODO: [🧠][🥜]

    let loopLimit = LOOP_LIMIT;
    while (unresovedTemplates.length > 0) {
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

        const currentlyResovedTemplates = unresovedTemplates.filter((template) =>
            template.dependentParameterNames.every((name) => resovedParameters.includes(name)),
        );

        if (currentlyResovedTemplates.length === 0) {
            throw new PipelineLogicError(
                // TODO: [🐎] DRY
                spaceTrim(
                    (block) => `

                        Can not resolve some parameters:
                        Either you are using a parameter that is not defined, or there are some circular dependencies.

                        Can not resolve:
                        ${block(
                            unresovedTemplates
                                .map(
                                    ({ resultingParameterName, dependentParameterNames }) =>
                                        `- Parameter {${resultingParameterName}} which depends on ${dependentParameterNames
                                            .map((dependentParameterName) => `{${dependentParameterName}}`)
                                            .join(' and ')}`,
                                )
                                .join('\n'),
                        )}

                        Resolved:
                        ${block(resovedParameters.map((name) => `- Parameter {${name}}`).join('\n'))}

                        ${block(pipelineIdentification)}
                    `,
                    // <- TODO: [🚞]
                ),
            );
        }

        resovedParameters = [
            ...resovedParameters,
            ...currentlyResovedTemplates.map(({ resultingParameterName }) => resultingParameterName),
        ];

        unresovedTemplates = unresovedTemplates.filter((template) => !currentlyResovedTemplates.includes(template));
    }
    return pipeline;
}

/**
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
 * TODO: [🧠][🐣] !!!! Validate that all samples match expectations
 * TODO: [🧠][🐣] !!!! Validate that knowledge is valid (non-void)
 * TODO: [🧠][🐣] !!!! Validate that persona can be used only with CHAT variant
 * TODO: !!!! Validate that parameter with reserved name not used RESERVED_PARAMETER_NAMES
 * TODO: !!!! Validate that reserved parameter is not used as joker
 * TODO: [🧠] !!! Validationg not only logic itself but imports around - files and websites and rerefenced pipelines exists
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 */
