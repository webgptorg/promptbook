import { LOOP_LIMIT } from '../../config';
import { RESERVED_PARAMETER_MISSING_VALUE, RESERVED_PARAMETER_RESTRICTED } from '../../constants';
import { LimitReachedError } from '../../errors/LimitReachedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { Parameters, string_parameter_name, string_template } from '../../types/typeAliases';
import type { really_unknown } from '../organization/really_unknown';
import { valueToString } from './valueToString';

/**
 * Replaces parameters in template with values from parameters object
 *
 * Note: This function is not places strings into string,
 *       It's more complex and can handle this operation specifically for LLM models
 *
 * @param template the template with parameters in {curly} braces
 * @param parameters the object with parameters
 * @returns the template with replaced parameters
 * @throws {PipelineExecutionError} if parameter is not defined, not closed, or not opened
 * @public exported from `@promptbook/utils`
 */
export function templateParameters(
    template: string_template,
    parameters: Record<string_parameter_name, really_unknown>,
): string {
    for (const [parameterName, parameterValue] of Object.entries(parameters)) {
        if (parameterValue === RESERVED_PARAMETER_MISSING_VALUE) {
            throw new UnexpectedError(`Parameter \`{${parameterName}}\` has missing value`);
        } else if (parameterValue === RESERVED_PARAMETER_RESTRICTED) {
            // TODO: [🍵]
            throw new UnexpectedError(`Parameter \`{${parameterName}}\` is restricted to use`);
        }
    }

    let replacedTemplates = template;
    let match: RegExpExecArray | null;

    let loopLimit = LOOP_LIMIT;
    while (
        (match = /^(?<precol>.*){(?<parameterName>\w+)}(.*)/m /* <- Not global */
            .exec(replacedTemplates))
    ) {
        if (loopLimit-- < 0) {
            throw new LimitReachedError('Loop limit reached during parameters replacement in `templateParameters`');
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
            throw new PipelineExecutionError(`Parameter \`{${parameterName}}\` is not defined`);
        }

        let parameterValue = (parameters as Parameters)[parameterName];

        if (parameterValue === undefined) {
            throw new PipelineExecutionError(`Parameter \`{${parameterName}}\` is not defined`);
        }

        parameterValue = valueToString(parameterValue);

        // Escape curly braces in parameter values to prevent prompt-injection
        parameterValue = parameterValue.replace(/[{}]/g, '\\$&');

        if (parameterValue.includes('\n') && /^\s*\W{0,3}\s*$/.test(precol)) {
            parameterValue = parameterValue
                .split(/\r?\n/)
                .map((line, index) => (index === 0 ? line : `${precol}${line}`))
                .join('\n');
        }

        replacedTemplates =
            replacedTemplates.substring(0, match.index + precol.length) +
            parameterValue +
            replacedTemplates.substring(match.index + precol.length + parameterName.length + 2);
    }

    // [💫] Check if there are parameters that are not closed properly
    if (/{\w+$/.test(replacedTemplates)) {
        throw new PipelineExecutionError('Parameter is not closed');
    }

    // [💫] Check if there are parameters that are not opened properly
    if (/^\w+}/.test(replacedTemplates)) {
        throw new PipelineExecutionError('Parameter is not opened');
    }

    return replacedTemplates;
}
