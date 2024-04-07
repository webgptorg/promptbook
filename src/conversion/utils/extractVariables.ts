import spaceTrim from 'spacetrim';
import { PromptbookSyntaxError } from '../../errors/PromptbookSyntaxError';
import { string_javascript, string_javascript_name } from '../../types/typeAliases';
/**
 * Parses the given script and returns the list of all used variables that are not defined in the script
 *
 * @param script from which to extract the variables
 * @returns the list of variable names
 * @throws {PromptbookSyntaxError} if the script is invalid
 *
 * @private within the promptbookStringToJson
 */

export function extractVariables(script: string_javascript): Array<string_javascript_name> {
    const variables: Array<string_javascript_name> = [];

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
                Note: Remapping error
                      From: [ReferenceError: thing is not defined],
                      To:   [Error: Parameter {thing} is not defined],
                */

                if (!undefinedName) {
                    throw error;
                }

                if (script.includes(undefinedName + '(')) {
                    script = `const ${undefinedName} = ()=>'';` + script;
                } else {
                    variables.push(undefinedName);
                    script = `const ${undefinedName} = '';` + script;
                }
            }
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        throw new PromptbookSyntaxError(
            spaceTrim(
                (block) => `
                    Can not extract variables from the script

                    ${block((error as Error).name)}: ${block((error as Error).message)}
                `,
            ),
        );
    }

    return variables;
}
