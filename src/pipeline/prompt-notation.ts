import spaceTrim from 'spacetrim';
import { REPLACING_NONCE } from '../constants';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { UnexpectedError } from '../errors/UnexpectedError';
import type { string_prompt } from '../types/typeAliases';
import type { really_unknown } from '../utils/organization/really_unknown';
import { isPromptMarked, markAsPromptNotation, removePromptMarker, templateParameters } from '../utils/parameters/templateParameters';

/**
 * Tag function for notating a prompt as template literal
 *
 * Note: There are 3 similar functions:
 * 1) `prompt` for notating single prompt exported from `@promptbook/utils`
 * 2) `promptTemplate` alias for `prompt`
 * 3) `book` for notating and validating entire books exported from `@promptbook/utils`
 *
 * @param strings
 * @param values - Can be any type (string, number, boolean, object, array, etc.)
 * @returns the prompt string
 * @public exported from `@promptbook/utils`
 */
export function prompt(strings: TemplateStringsArray, ...values: Array<really_unknown>): string_prompt {
    if (values.length === 0) {
        const result = spaceTrim(strings.join(''));
        // Mark it so it can be used as a parameter in other prompts
        return markAsPromptNotation(result) as string_prompt;
    }

    const stringsWithHiddenParameters = strings.map((stringsItem) =>
        // TODO: [0] DRY
        stringsItem.split('{').join(`${REPLACING_NONCE}beginbracket`).split('}').join(`${REPLACING_NONCE}endbracket`),
    );

    //const placeholderParameterNames = values.map((value, i) => `${REPLACING_NONCE}${i}`);
    const placeholderParameterNames = values.map((value, i) => `__promptParam${i}`);
    // Mark string values that come from prompt calls so they can be detected later
    const markedValues = values.map((value) => {
        if (typeof value === 'string' && !isPromptMarked(value)) {
            // Regular strings - don't mark them
            return value;
        } else if (typeof value === 'string' && isPromptMarked(value)) {
            // Already marked - keep the mark
            return value;
        }  else {
            // Non-string values - don't mark
            return value;
        }
    });
    const parameters = Object.fromEntries(markedValues.map((value, i) => [placeholderParameterNames[i], value]));

    // Combine strings and values
    let pipelineString = stringsWithHiddenParameters.reduce(
        (result, stringsItem, i) =>
            placeholderParameterNames[i] === undefined
                ? `${result}${stringsItem}`
                : `${result}${stringsItem}{${placeholderParameterNames[i]}}`,
        '',
    );

    pipelineString = spaceTrim(pipelineString);

    try {
        pipelineString = templateParameters(pipelineString, parameters);
    } catch (error) {
        if (!(error instanceof PipelineExecutionError)) {
            throw error;
        }

        console.error({ pipelineString, parameters, placeholderParameterNames, error });
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Internal error in prompt template literal
                  
                    ${block(JSON.stringify({ strings, values }, null, 4))}}
                  
                `,
            ),
        );
    }

    // TODO: [0] DRY
    pipelineString = pipelineString
        .split(`${REPLACING_NONCE}beginbracket`)
        .join('{')
        .split(`${REPLACING_NONCE}endbracket`)
        .join('}');

    // Mark the result as prompt notation so it can be detected when used as a parameter
    // Note: The marker will be present in the returned string, but will be automatically
    // removed by templateParameters when this is used as a parameter in another prompt call
    return markAsPromptNotation(pipelineString);
}

/**
 * Tag function for notating a prompt as template literal
 *
 * Note: There are 3 similar functions:
 * 1) `prompt` for notating single prompt exported from `@promptbook/utils`
 * 2) `promptTemplate` alias for `prompt`
 * 3) `book` for notating and validating entire books exported from `@promptbook/utils`
 *
 * @alias prompt
 * @public exported from `@promptbook/utils`
 */
export const promptTemplate = prompt;

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
