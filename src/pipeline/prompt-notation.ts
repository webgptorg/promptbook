import spaceTrim from 'spacetrim';
import { templateParameters } from '../_packages/utils.index';
import { REPLACING_NONCE } from '../constants';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { UnexpectedError } from '../errors/UnexpectedError';
import { string_prompt } from '../types/typeAliases';

/**
 * Tag function for notating a prompt as template literal
 *
 * Note: There are 2 similar functions:
 * 1) `prompt` for notating single prompt exported from `@promptbook/utils`
 * 1) `book` for notating and validating entire books exported from `@promptbook/utils`
 *
 * @param strings @@@
 * @param values @@@
 * @returns the pipeline string
 * @public exported from `@promptbook/utils`
 */
export function prompt(strings: TemplateStringsArray, ...values: Array<string>): string_prompt {
    if (values.length === 0) {
        return spaceTrim(strings.join(''));
    }

    const placeholderParameterNames = values.map((value, i) => `${REPLACING_NONCE}${i}`);
    const parameters = Object.fromEntries(values.map((value, i) => [placeholderParameterNames[i], value]));

    // Combine strings and values
    let pipelineString = strings.reduce(
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

    return pipelineString;
}

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
