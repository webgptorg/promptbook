import { string_template } from '.././types/typeAliases';
import { Parameters } from '../types/Parameters';

/**
 * Replaces parameters in template with values from parameters object
 *
 * @param template the template with parameters in {curly} braces
 * @param parameters the object with parameters
 * @returns the template with replaced parameters
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
                throw new Error('Parameter is already opened or not closed');
            }

            if ((parameters as Record<string, string>)[paramName] === undefined) {
                throw new Error(`Parameter {${paramName}} is not defined`);
            }

            replacedTemplate = replacedTemplate.replace(
                new RegExp(placeholder, 'g'),
                (parameters as Record<string, string>)[paramName]!,
            );
        }
    }

    // [💫] Check if there are parameters that are not closed properly
    if (/{\w+$/.test(replacedTemplate)) {
        throw new Error('Parameter is not closed');
    }

    // [💫] Check if there are parameters that are not opened properly
    if (/^\w+}/.test(replacedTemplate)) {
        throw new Error('Parameter is not opened');
    }

    return replacedTemplate;
}
