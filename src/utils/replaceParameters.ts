import { string_name, string_template } from '.././types/typeAliases';

/**
 * Replaces parameters in template with values from parameters object
 *
 * @param template the template with parameters in {curly} braces
 * @param parameters the object with parameters
 * @returns the template with replaced parameters
 *
 * @private within the library
 */
export function replaceParameters(template: string_template, parameters: {}): string {
    let result = '';
    let openedParamName: string | null = null;

    // Note: We dont want parameters with index signature here because it wont be compatible with PromptTemplateParameters which has its own reasons to not have index signature
    const parametersChecked = parameters as Record<
        string_name,
        string
    >; /* <- TODO: Make here some util validateTemplateParameters */

    for (const char of template.split('')) {
        if (char === '{') {
            if (openedParamName !== null) {
                throw new Error('Parameter is already opened');
            }
            openedParamName = '';
        } else if (char === '}') {
            if (openedParamName === null) {
                throw new Error('Parameter is not opened');
            }
            if (parametersChecked[openedParamName] === undefined) {
                throw new Error(`Parameter {${openedParamName}} is not defined`);
            }
            result += parametersChecked[openedParamName];
            openedParamName = null;
        } else if (openedParamName === null) {
            result += char;
        } else if (openedParamName !== null) {
            openedParamName += char;
        }
    }

    if (openedParamName !== null) {
        throw new Error('Parameter is not closed');
    }

    return result;
}

/**
 * TODO: [🧠] More advanced templating
 * TODO: [🧠] Maybe use some template engine / library not own simple implementation
 */
