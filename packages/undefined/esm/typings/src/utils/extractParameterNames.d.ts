import type { string_parameter_name } from '../types/typeAliases';
import type { string_template } from '../types/typeAliases';
/**
 * Parses the template and returns the list of all parameter names
 *
 * @param template the template with parameters in {curly} braces
 * @returns the list of parameter names
 * @public exported from `@promptbook/utils`
 */
export declare function extractParameterNames(template: string_template): Set<string_parameter_name>;
