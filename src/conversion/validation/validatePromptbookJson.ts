import { spaceTrim } from 'spacetrim';
import { LOOP_LIMIT } from '../../config';
import { PromptbookLogicError } from '../../errors/PromptbookLogicError';
import { PromptbookSyntaxError } from '../../errors/PromptbookSyntaxError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PromptTemplateJson } from '../../types/PromptbookJson/PromptTemplateJson';
import type { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
import type { string_name } from '../../types/typeAliases';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';

/**
 * Validates PromptbookJson if it is logically valid
 *
 * It checks:
 * -   if it has correct parameters dependency
 *
 * It does NOT check:
 * -   if it is valid json
 * -   if it is meaningful
 *
 * @param promptbook valid or invalid PromptbookJson
 * @returns the same promptbook if it is logically valid
 * @throws {PromptbookLogicError} on logical error in the promptbook
 */
export function validatePromptbookJson(promptbook: PromptbookJson): PromptbookJson {
    // TODO: [🧠] Maybe test if promptbook is a promise and make specific error case for that

    if (promptbook.promptbookUrl !== undefined) {
        if (!isValidUrl(promptbook.promptbookUrl)) {
            // TODO: This should be maybe the syntax error detected during parsing
            throw new PromptbookLogicError(`Invalid promptbook URL "${promptbook.promptbookUrl}"`);
        }
    }

    // TODO: [🧠] Maybe do here some propper JSON-schema / ZOD checking
    if (!Array.isArray(promptbook.parameters)) {
        // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
        throw new PromptbookSyntaxError(
            spaceTrim(`
                Promptbook is valid JSON but with wrong structure

                promptbook.parameters expected to be an array, but got ${typeof promptbook.parameters}
            `),
        );
    }

    // TODO: [🧠] Maybe do here some propper JSON-schema / ZOD checking
    if (!Array.isArray(promptbook.promptTemplates)) {
        // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
        throw new PromptbookSyntaxError(
            spaceTrim(`
              Promptbook is valid JSON but with wrong structure

              promptbook.promptTemplates expected to be an array, but got ${typeof promptbook.promptTemplates}
          `),
        );
    }

    // Note: Check each parameter individually
    for (const parameter of promptbook.parameters) {
        if (parameter.isInput && parameter.isOutput) {
            throw new PromptbookLogicError(`Parameter {${parameter.name}} can not be both input and output`);
        }

        // Note: Testing that parameter is either intermediate or output BUT not created and unused
        if (
            !parameter.isInput &&
            !parameter.isOutput &&
            !promptbook.promptTemplates.some((template) => template.dependentParameterNames.includes(parameter.name))
        ) {
            throw new PromptbookLogicError(
                spaceTrim(`
                    Parameter {${parameter.name}} is created but not used

                    You can declare {${parameter.name}} as output parameter by adding in the header:
                    - OUTPUT PARAMETER \`{${parameter.name}}\` ${parameter.description || ''}

                `),
            );
        }

        // Note: Testing that parameter is either input or result of some template
        if (
            !parameter.isInput &&
            !promptbook.promptTemplates.some((template) => template.resultingParameterName === parameter.name)
        ) {
            throw new PromptbookLogicError(
                spaceTrim(`
                    Parameter {${parameter.name}} is declared but not defined

                    You can do one of these:
                    - Remove declaration of {${parameter.name}}
                    - Add prompt template that results in -> {${parameter.name}}

                `),
            );
        }
    }

    // Note: Check each template individually
    const definedParameters: Set<string> = new Set(
        promptbook.parameters.filter(({ isInput }) => isInput).map(({ name }) => name),
    );
    for (const template of promptbook.promptTemplates) {
        if (definedParameters.has(template.resultingParameterName)) {
            throw new PromptbookLogicError(`Parameter {${template.resultingParameterName}} is defined multiple times`);
        }

        definedParameters.add(template.resultingParameterName);

        if (
            template.executionType === 'PROMPT_TEMPLATE' &&
            (template.modelRequirements.modelVariant === undefined)
        ) {
            throw new PromptbookLogicError(
                spaceTrim(`

                  You must specify MODEL VARIANT in the prompt template "${template.title}"

                  For example:
                  - MODEL VARIANT Chat
                  - MODEL NAME \`gpt-4-1106-preview\`

              `),
            );
        }

        if (template.jokers && template.jokers.length > 0) {
            if (
                !template.expectFormat &&
                !template.expectations /* <- TODO: Require at least 1 -> min <- expectation to use jokers */
            ) {
                throw new PromptbookLogicError(
                    `Joker parameters are used for {${template.resultingParameterName}} but no expectations are defined`,
                );
            }

            for (const joker of template.jokers) {
                if (!template.dependentParameterNames.includes(joker)) {
                    throw new PromptbookLogicError(
                        `Parameter {${joker}} is used for {${template.resultingParameterName}} as joker but not in dependentParameterNames`,
                    );
                }
            }
        }

        if (template.expectations) {
            for (const [unit, { min, max }] of Object.entries(template.expectations)) {
                if (min !== undefined && max !== undefined && min > max) {
                    throw new PromptbookLogicError(
                        `Min expectation (=${min}) of ${unit} is higher than max expectation (=${max})`,
                    );
                }

                if (min !== undefined && min < 0) {
                    throw new PromptbookLogicError(`Min expectation of ${unit} must be zero or positive`);
                }

                if (max !== undefined && max <= 0) {
                    throw new PromptbookLogicError(`Max expectation of ${unit} must be positive`);
                }
            }
        }
    }

    // Note: Detect circular dependencies
    let resovedParameters: Array<string_name> = promptbook.parameters
        .filter(({ isInput }) => isInput)
        .map(({ name }) => name);
    let unresovedTemplates: Array<PromptTemplateJson> = [...promptbook.promptTemplates];

    let loopLimit = LOOP_LIMIT;
    while (unresovedTemplates.length > 0) {
        if (loopLimit-- < 0) {
            throw new UnexpectedError(
                'Loop limit reached during detection of circular dependencies in `validatePromptbookJson`',
            );
        }

        const currentlyResovedTemplates = unresovedTemplates.filter((template) =>
            template.dependentParameterNames.every((name) => resovedParameters.includes(name)),
        );

        if (currentlyResovedTemplates.length === 0) {
            throw new PromptbookLogicError(
                spaceTrim(
                    (block) => `

                        Can not resolve some parameters
                        It may be circular dependencies

                        Can not resolve:
                        ${block(
                            unresovedTemplates
                                .map(
                                    ({ resultingParameterName, dependentParameterNames }) =>
                                        `- {${resultingParameterName}} depends on ${dependentParameterNames
                                            .map((dependentParameterName) => `{${dependentParameterName}}`)
                                            .join(', ')}`,
                                )
                                .join('\n'),
                        )}

                        Resolved:
                        ${block(resovedParameters.map((name) => `- {${name}}`).join('\n'))}
                    `,
                ),
            );
        }

        resovedParameters = [
            ...resovedParameters,
            ...currentlyResovedTemplates.map(({ resultingParameterName }) => resultingParameterName),
        ];

        unresovedTemplates = unresovedTemplates.filter((template) => !currentlyResovedTemplates.includes(template));
    }
    return promptbook;
}

/**
 * TODO: [🧠] Work with promptbookVersion
 * TODO: Use here some json-schema, Zod or something similar and change it to:
 *     > /**
 *     >  * Validates PromptbookJson if it is logically valid.
 *     >  *
 *     >  * It checks:
 *     >  * -   it has a valid structure
 *     >  * -   ...
 *     >  ex port function validatePromptbookJson(promptbook: unknown): asserts promptbook is PromptbookJson {
 */
