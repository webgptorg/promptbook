import { string_template } from '.././types/typeAliases';
import { Parameters } from '../types/Parameters';

/**
 * Replaces parameters in template with values from parameters object
 *
 * @param template the template with parameters in {curly} braces
 * @param parameters the object with parameters
 * @returns the template with replaced parameters
 *
 * @private within the library
 */
export function replaceParameters(template: string_template, parameters: Parameters): string {
    const placeholders = template.matchAll(/{(?<parameterName>\w+)(\[(?<index>[ijklmno])\])?}/g);
    let replacedTemplate = template;

    for (const placeholder of placeholders) {
        const parameterName = placeholder.groups!.parameterName!;
        const indexName = placeholder.groups!.index;

        if (parameterName === '') {
            continue; // Skip empty placeholders. It's used to avoid confusion with JSON-like strings
        }

        if (parameterName.indexOf('{') !== -1 || parameterName.indexOf('}') !== -1) {
            throw new Error('Parameter is already opened or not closed');
        }

        if ((parameters as Record<string, string>)[parameterName] === undefined) {
            throw new Error(`Parameter {${parameterName}} is not defined`);
        }

        let parameterValue = (parameters as Record<string, unknown>)[parameterName];

        if (!indexName) {
            if (typeof parameterValue !== 'string') {
                throw new Error(
                    `Value of parameter {${parameterName}} is not string but ${JSON.stringify(parameterValue)}`,
                );
            }

            replacedTemplate = replacedTemplate.replace(`{${parameterName}}`, parameterValue);
        } else {
            if (!Array.isArray(parameterValue)) {
                throw new Error(`Using index on non-array value`);
            }

            const indexValue = (parameters as Record<string, unknown>)[indexName];

            if (typeof indexValue !== 'number') {
                throw new Error(`Index parameter value [${indexName}] is not number but ${JSON.stringify(indexValue)}`);
            }

            parameterValue = parameterValue[indexValue];

            if (typeof parameterValue !== 'string') {
                throw new Error(
                    `Value of parameter {${parameterName}[${indexName}]} is not string but ${JSON.stringify(
                        parameterValue,
                    )}`,
                );
            }

            replacedTemplate = replacedTemplate.replace(`{${parameterName}[${indexName}]}`, parameterValue);
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
