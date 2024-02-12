import { string_name, string_template } from '../types/typeAliases';

/**
 * Parses the template and returns the list of all parameter names
 *
 * @param template the template with parameters in {curly} braces
 * @returns the list of parameter names
 *
 * @private within the library
 */
export function extractParameters(
    template: string_template,
): Array<{ parameterName: string_name; indexName?: string_name }> {
    const matches = template.matchAll(/{(?<parameterName>\w+)(\[(?<indexName>[i-z]{1})\])?}/gi);
    const parameters: Array<{ parameterName: string_name; indexName?: string_name }> = [];
    for (const match of matches) {
        const parameterName = match.groups!.parameterName!;
        const indexName = match.groups!.indexName;

        parameters.push({ parameterName, indexName });
    }

    return parameters;
}
