import type { string_name } from '../types/typeAliases';
import type { string_parameter_name } from '../types/typeAliases';
import type { string_template } from '../types/typeAliases';

/**
 * Parses the template and returns the list of all parameter names
 *
 * @param template the template with parameters in {curly} braces
 * @returns the list of parameter names
 */
export function extractParameters(template: string_template): Set<string_parameter_name> {
    const matches = template.matchAll(/{\w+}/g);
    const parameterNames = new Set<string_name>();
    for (const match of matches) {
        const parameterName = match[0].slice(1, -1);

        parameterNames.add(parameterName);
    }

    return parameterNames;
}


/**
 * TODO: !!!!! Rename to extractParameterNames
 */