import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../errors/ParseError';
import type { string_javascript } from '../../types/typeAliases';
import type { string_javascript_name } from '../../types/typeAliases';
/**
 * Parses the given script and returns the list of all used variables that are not defined in the script
 *
 * @param script from which to extract the variables
 * @returns the list of variable names
 * @throws {ParseError} if the script is invalid
 * @public exported from `@promptbook/utils` <- Note: [👖] This is usable elsewhere than in Promptbook, so keeping in utils
 */
export function extractVariablesFromScript(script: string_javascript): Set<string_javascript_name> {
    const variables = new Set<string_javascript_name>();

    const originalScript = script;
    script = `(()=>{${script}})()`;

    try {
        for (let i = 0; i < 100 /* <- TODO: This limit to configuration */; i++)
            try {
                eval(script);
            } catch (error) {
                if (!(error instanceof ReferenceError)) {
                    throw error;
                }

                /*
                Note: Parsing the error
                      🌟 Most devices:
                      [PipelineUrlError: thing is not defined]

                      🍏 iPhone`s Safari:
                      [PipelineUrlError: Can't find variable: thing]
                */

                let variableName: string | undefined = undefined;

                if (error.message.startsWith(`Can't`)) {
                    // 🍏 Case
                    variableName = error.message.split(' ').pop();
                } else {
                    // 🌟 Case
                    variableName = error.message.split(' ').shift();
                }

                if (variableName === undefined) {
                    throw error;
                }

                if (script.includes(variableName + '(')) {
                    script = `const ${variableName} = ()=>'';` + script;
                } else {
                    variables.add(variableName);
                    script = `const ${variableName} = '';` + script;
                }
            }
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        throw new ParseError(
            spaceTrim(
                (block) => `
                    Can not extract variables from the script
                    ${block((error as Error).stack || (error as Error).message)}

                    Found variables:
                    ${Array.from(variables)
                        .map((variableName, i) => `${i + 1}) ${variableName}`)
                        .join('\n')}


                    The script:

                    \`\`\`javascript
                    ${block(originalScript)}
                    \`\`\`
                `,
                // <- TODO: [🚞] Pass from consumer(s) of `extractVariablesFromScript`
            ),
        );
    }

    return variables;
}

/**
 * TODO: [🔣] Support for multiple languages - python, java,...
 */
