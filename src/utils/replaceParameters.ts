import { LOOP_LIMIT } from '../config';
import { LimitReachedError } from '../errors/LimitReachedError';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import type { Parameters, string_template } from '../types/typeAliases';

/**
 * Replaces parameters in template with values from parameters object
 *
 * @param template the template with parameters in {curly} braces
 * @param parameters the object with parameters
 * @returns the template with replaced parameters
 * @throws {PipelineExecutionError} if parameter is not defined, not closed, or not opened
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
            throw new LimitReachedError('Loop limit reached during parameters replacement in `replaceParameters`');
        }

        const precol = match.groups!.precol!;
        const parameterName = match.groups!.parameterName!;

        if (parameterName === '') {
            // Note: Skip empty placeholders. It's used to avoid confusion with JSON-like strings
            continue;
        }

        if (parameterName.indexOf('{') !== -1 || parameterName.indexOf('}') !== -1) {
            throw new PipelineExecutionError('Parameter is already opened or not closed');
        }

        if ((parameters as Parameters)[parameterName] === undefined) {
            throw new PipelineExecutionError(`Parameter {${parameterName}} is not defined`);
        }

        let parameterValue = (parameters as Parameters)[parameterName];

        if (parameterValue === undefined) {
            throw new PipelineExecutionError(`Parameter {${parameterName}} is not defined`);
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
        throw new PipelineExecutionError('Parameter is not closed');
    }

    // [💫] Check if there are parameters that are not opened properly
    if (/^\w+}/.test(replacedTemplate)) {
        throw new PipelineExecutionError('Parameter is not opened');
    }

    return replacedTemplate;
}
