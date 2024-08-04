import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import type { string_parameter_name } from '../../types/typeAliases';
import { extractParameters } from '../../utils/extractParameters';
import { extractVariables } from './extractVariables';

/**
 * Parses the prompt template and returns the set of all used parameters
 *
 * @param promptTemplate the template with used parameters
 * @returns the set of parameter names
 * @throws {ParsingError} if the script is invalid
 */
export function extractParametersFromPromptTemplate(
    promptTemplate: Pick<
        PromptTemplateJson,
        'title' | 'description' | 'blockType' | 'content' | 'preparedContent' | 'jokerParameterNames'
    >,
    // <- TODO: [🧠][🥜]
): Set<string_parameter_name> {
    const { title, description, blockType, content, preparedContent, jokerParameterNames } = promptTemplate;
    const parameterNames = new Set<string_parameter_name>();

    for (const parameterName of [
        ...extractParameters(title),
        ...extractParameters(description || ''),
        ...extractParameters(content),
        ...extractParameters(preparedContent || ''),
    ]) {
        parameterNames.add(parameterName);
    }

    if (blockType === 'SCRIPT') {
        for (const parameterName of extractVariables(content)) {
            parameterNames.add(parameterName);
        }
    }

    for (const jokerName of jokerParameterNames || []) {
        parameterNames.add(jokerName);
    }

    parameterNames.delete('content');
    //                      <- Note {content} is used in `preparedContent`

    return parameterNames;
}

/**
 * TODO: [🔣] If script require contentLanguage
 */
