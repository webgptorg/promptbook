import type { Parameters } from '../types/typeAliases';
import type { string_template } from '../types/typeAliases';
/**
 * Replaces parameters in template with values from parameters object
 *
 * @param template the template with parameters in {curly} braces
 * @param parameters the object with parameters
 * @returns the template with replaced parameters
 * @throws {PipelineExecutionError} if parameter is not defined, not closed, or not opened
 * @public exported from `@promptbook/utils`
 */
export declare function replaceParameters(template: string_template, parameters: Parameters): string;
