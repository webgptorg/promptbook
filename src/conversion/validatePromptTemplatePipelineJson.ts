import { PromptTemplatePipelineJson } from '../types/PromptTemplatePipelineJson/PromptTemplatePipelineJson';

/**
 * Validates PromptTemplatePipelineJson if it is logically valid.
 *
 * It checks:
 * -   if it has correct parameters dependency
 *
 * It does NOT check:
 * -   if it is valid json
 * -   if it is meaningful
 *
 * @param ptp valid or invalid PromptTemplatePipelineJson
 * @throws {Error} if invalid
 */
export function validatePromptTemplatePipelineJson(ptp: PromptTemplatePipelineJson): void {
    const definedParameters: Set<string> = new Set(
        ptp.parameters.filter(({ isInput }) => isInput).map(({ name }) => name),
    );

    for (const template of ptp.promptTemplates) {
        for (const match of Array.from(template.content.matchAll(/\{(?<parameterName>[a-z0-9_]+)\}/gi))) {
            const parameterName = match!.groups!.parameterName!;

            if (!definedParameters.has(parameterName)) {
                throw new Error(`Parameter {${parameterName}} used before defined`);
            }
        }

        if (definedParameters.has(template.resultingParameterName)) {
            throw new Error(`Parameter {${template.resultingParameterName}} is defined multiple times`);
        }

        if (template.jokers && template.jokers.length > 0) {
            for (const joker of template.jokers) {
                if (!definedParameters.has(joker)) {
                    throw new Error(`Joker parameter {${joker}} used before defined`);
                }
            }

            if (
                !template.expectFormat &&
                !template.expectAmount /* <- TODO: Require at least 1 -> min <- expectation to use jokers */
            ) {
                throw new Error(`Joker parameters are used but no expectations are defined`);
            }
        }

        if (template.expectAmount) {
            for (const [unit, { min, max }] of Object.entries(template.expectAmount)) {
                if (min !== undefined && max !== undefined && min > max) {
                    throw new Error(`Min expectation (=${min}) of ${unit} is higher than max expectation (=${max})`);
                }

                if (min !== undefined && min <= 0) {
                    throw new Error(`Min expectation of ${unit} must be positive`);
                }
            }
        }

        definedParameters.add(template.resultingParameterName);
    }
}

/**
 * TODO: [🧠] Work with ptbkVersion
 * TODO: Use here some json-schema, Zod or something similar and change it to:
 *     > /**
 *     >  * Validates PromptTemplatePipelineJson if it is logically valid.
 *     >  *
 *     >  * It checks:
 *     >  * -   it has a valid structure
 *     >  * -   ...
 *     >  ex port function validatePromptTemplatePipelineJson(ptp: unknown): asserts ptp is PromptTemplatePipelineJson {
 */
