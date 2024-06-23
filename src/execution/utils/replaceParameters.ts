import { LOOP_LIMIT } from '../../config';
import { TemplateError } from '../../errors/TemplateError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { Parameters } from '../../types/Parameters';
import type { string_template } from '../../types/typeAliases';

/**
 * Replaces parameters in template with values from parameters object
 *
 * @param template the template with parameters in {curly} braces
 * @param parameters the object with parameters
 * @returns the template with replaced parameters
 * @throws {TemplateError} if parameter is not defined, not closed, or not opened
 *
 * @private within the createPromptbookExecutor
 */
export function replaceParameters(template: string_template, parameters: Parameters): string {
    let replacedTemplate = template;
    let match: RegExpExecArray | null;

    let loopLimit = LOOP_LIMIT;
    while (
        (match = /^(?<precol>.*){(?<parameterName>\w+)}(.*)/m /* <- Not global */
            .exec(replacedTemplate))
    ) {
        if (loopLimit-- < 0) {
            throw new UnexpectedError('Loop limit reached during parameters replacement in `replaceParameters`');
        }

        const precol = match.groups!.precol!;
        const parameterName = match.groups!.parameterName!;

        if (parameterName === '') {
            // Note: Skip empty placeholders. It's used to avoid confusion with JSON-like strings
            continue;
        }

        if (parameterName.indexOf('{') !== -1 || parameterName.indexOf('}') !== -1) {
            throw new TemplateError('Parameter is already opened or not closed');
        }

        if ((parameters as Record<string, string>)[parameterName] === undefined) {
            throw new TemplateError(`Parameter {${parameterName}} is not defined`);
        }

        let parameterValue = (parameters as Record<string, string>)[parameterName];

        if (parameterValue === undefined) {
            throw new TemplateError(`Parameter {${parameterName}} is not defined`);
        }

        parameterValue = parameterValue.toString();

        if (parameterValue.includes('\n') && /^\s*\W{0,3}\s*$/.test(precol)) {
            parameterValue = parameterValue
                .split('\n')
                .map((line, index) => (index === 0 ? line : `${precol}${line}`))
                .join('\n');
        }

        replacedTemplate =
            replacedTemplate.substring(0, match.index + precol.length) +
            parameterValue +
            replacedTemplate.substring(match.index + precol.length + parameterName.length + 2);
    }

    // [💫] Check if there are parameters that are not closed properly
    if (/{\w+$/.test(replacedTemplate)) {
        throw new TemplateError('Parameter is not closed');
    }

    // [💫] Check if there are parameters that are not opened properly
    if (/^\w+}/.test(replacedTemplate)) {
        throw new TemplateError('Parameter is not opened');
    }

    return replacedTemplate;
}
