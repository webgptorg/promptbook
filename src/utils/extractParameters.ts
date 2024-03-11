import { string_name, string_template } from '../types/typeAliases';

/**
 * Parses the template and returns the list of all parameter names
 *
 * @param template the template with parameters in {curly} braces
 * @returns the list of parameter names
 *
 * @private within the library
 */

export function extractParameters(template: string_template): Array<string_name> {
    const matches = template.matchAll(/{\w+}/g);
    const parameterNames: Array<string_name> = [];
    for (const match of matches) {
        const parameterName = match[0].slice(1, -1);

        if (!parameterNames.includes(parameterName)) {
            parameterNames.push(parameterName);
        }
    }

    return parameterNames;
}
