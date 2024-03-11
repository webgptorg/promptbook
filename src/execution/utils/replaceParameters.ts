import { PromptbookExecutionError } from '../../errors/PromptbookExecutionError';
import { Parameters } from '../../types/Parameters';
import { string_template } from '../../types/typeAliases';

/**
 * Replaces parameters in template with values from parameters object
 *
 * @param template the template with parameters in {curly} braces
 * @param parameters the object with parameters
 * @returns the template with replaced parameters
 *
 * @private within the createPromptbookExecutor
 */
export function replaceParameters(template: string_template, parameters: Parameters): string {
    const placeholders = template.match(/{\w+}/g);
    let replacedTemplate = template;

    if (placeholders) {
        for (const placeholder of placeholders) {
            const paramName = placeholder.slice(1, -1); // Remove the curly braces to get the parameter name

            if (paramName === '') {
                continue; // Skip empty placeholders. It's used to avoid confusion with JSON-like strings
            }

            if (paramName.indexOf('{') !== -1 || paramName.indexOf('}') !== -1) {
                throw new PromptbookExecutionError('Parameter is already opened or not closed');
            }

            if ((parameters as Record<string, string>)[paramName] === undefined) {
                throw new PromptbookExecutionError(`Parameter {${paramName}} is not defined`);
            }

            let parameterValue = (parameters as Record<string, string>)[paramName]!;

            replacedTemplate = replacedTemplate.replace(
                new RegExp(placeholder, 'g'),
                parameterValue,
            );
        }
    }

    // [💫] Check if there are parameters that are not closed properly
    if (/{\w+$/.test(replacedTemplate)) {
        throw new PromptbookExecutionError('Parameter is not closed');
    }

    // [💫] Check if there are parameters that are not opened properly
    if (/^\w+}/.test(replacedTemplate)) {
        throw new PromptbookExecutionError('Parameter is not opened');
    }

    return replacedTemplate;
}
