import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import type { string_name } from '../../types/typeAliases';
import { extractParameters } from '../../utils/extractParameters';
import { extractVariables } from './extractVariables';

/**
 * Parses the prompt template and returns the set of all used parameters
 *
 * @param promptTemplate the template with used parameters
 * @returns the set of parameter names
 * @throws {PromptbookSyntaxError} if the script is invalid
 */
export function extractParametersFromPromptTemplate(
    promptTemplate: Pick<PromptTemplateJson, 'title' | 'description' | 'executionType' | 'content'>,
): Set<string_name> {
    const parameterNames = new Set<string_name>();

    for (const parameterName of [
        ...extractParameters(promptTemplate.title),
        ...extractParameters(promptTemplate.description || ''),
        ...extractParameters(promptTemplate.content),
    ]) {
        parameterNames.add(parameterName);
    }

    if (promptTemplate.executionType === 'SCRIPT') {
        for (const parameterName of extractVariables(promptTemplate.content)) {
            parameterNames.add(parameterName);
        }
    }

    return parameterNames;
}

/**
 * TODO: [🔣] If script require contentLanguage
 */
