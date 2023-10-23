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

        definedParameters.add(template.resultingParameterName);
    }
}

/**
 * TODO: [🧠] Work with ptpVersion
 * TODO: Use here some json-schema, Zod or something similar and change it to:
 *     > /**
 *     >  * Validates PromptTemplatePipelineJson if it is logically valid.
 *     >  *
 *     >  * It checks:
 *     >  * -   it has a valid structure
 *     >  * -   ...
 *     >  export function validatePromptTemplatePipelineJson(ptp: unknown): asserts ptp is PromptTemplatePipelineJson {
 */
