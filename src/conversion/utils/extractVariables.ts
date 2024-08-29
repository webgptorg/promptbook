import { spaceTrim } from 'spacetrim';
import { ParsingError } from '../../errors/ParsingError';
import type { string_javascript, string_javascript_name } from '../../types/typeAliases';
/**
 * Parses the given script and returns the list of all used variables that are not defined in the script
 *
 * @param script from which to extract the variables
 * @returns the list of variable names
 * @throws {ParsingError} if the script is invalid
 * @public exported from `@promptbook/utils`
 */
export function extractVariables(script: string_javascript): Set<string_javascript_name> {
    const variables = new Set<string_javascript_name>();

    script = `(()=>{${script}})()`;

    try {
        for (let i = 0; i < 100 /* <- TODO: This limit to configuration */; i++)
            try {
                eval(script);
            } catch (error) {
                if (!(error instanceof ReferenceError)) {
                    throw error;
                }
                const undefinedName = error.message.split(' ')[0];
                /*
                Note: Parsing the error
                      [PipelineUrlError: thing is not defined]
                */

                if (!undefinedName) {
                    throw error;
                }

                if (script.includes(undefinedName + '(')) {
                    script = `const ${undefinedName} = ()=>'';` + script;
                } else {
                    variables.add(undefinedName);
                    script = `const ${undefinedName} = '';` + script;
                }
            }
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        throw new ParsingError(
            spaceTrim(
                (block) => `
                    Can not extract variables from the script

                    ${block((error as Error).toString())}}
                `,
                // <- TODO: [🚞] Pass from consumer(s) of `extractVariables`
            ),
        );
    }

    return variables;
}

/**
 * TODO: [🔣] Support for multiple languages - python, java,...
 */
