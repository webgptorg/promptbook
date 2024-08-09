import type { string_javascript } from '../../types/typeAliases';
import type { string_javascript_name } from '../../types/typeAliases';
/**
 * Parses the given script and returns the list of all used variables that are not defined in the script
 *
 * @param script from which to extract the variables
 * @returns the list of variable names
 * @throws {ParsingError} if the script is invalid
 * @public exported from `@promptbook/utils`
 */
export declare function extractVariables(script: string_javascript): Set<string_javascript_name>;
/**
 * TODO: [🔣] Support for multiple languages - python, java,...
 */
