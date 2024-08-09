import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import type { string_parameter_name } from '../../types/typeAliases';
/**
 * Parses the prompt template and returns the set of all used parameters
 *
 * @param promptTemplate the template with used parameters
 * @returns the set of parameter names
 * @throws {ParsingError} if the script is invalid
 * @public exported from `@promptbook/utils`
 */
export declare function extractParameterNamesFromPromptTemplate(promptTemplate: Pick<PromptTemplateJson, 'title' | 'description' | 'blockType' | 'content' | 'preparedContent' | 'jokerParameterNames'>): Set<string_parameter_name>;
/**
 * TODO: [🔣] If script require contentLanguage
 */
