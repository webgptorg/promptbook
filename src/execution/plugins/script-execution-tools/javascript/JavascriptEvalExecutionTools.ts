import {
    capitalize as _capitalize,
    decapitalize as _decapitalize,
    nameToUriPart as _nameToUriPart,
    nameToUriParts as _nameToUriParts,
    normalizeToKebabCase as _normalizeToKebabCase,
    normalizeTo_PascalCase as _normalizeTo_PascalCase,
    normalizeTo_SCREAMING_CASE as _normalizeTo_SCREAMING_CASE,
    normalizeTo_camelCase as _normalizeTo_camelCase,
    normalizeTo_snake_case as _normalizeTo_snake_case,
    normalizeWhitespaces as _normalizeWhitespaces,
    removeDiacritics as _removeDiacritics,
    parseKeywordsFromString,
} from 'n12';
import _spaceTrim from 'spacetrim';
import { PromptbookExecutionError } from '../../../../errors/PromptbookExecutionError';
import type { string_javascript } from '../../../../types/typeAliases';
import { prettifyMarkdown as _prettifyMarkdown } from '../../../../utils/markdown/prettifyMarkdown';
import { removeEmojis as _removeEmojis } from '../../../../utils/removeEmojis';
import { removeQuotes as _removeQuotes } from '../../../../utils/removeQuotes';
import { trimCodeBlock as _trimCodeBlock } from '../../../../utils/trimCodeBlock';
import { trimEndOfCodeBlock as _trimEndOfCodeBlock } from '../../../../utils/trimEndOfCodeBlock';
import { unwrapResult as _unwrapResult } from '../../../../utils/unwrapResult';
import { ScriptExecutionTools, ScriptExecutionToolsExecuteOptions } from '../../../ScriptExecutionTools';
import { JavascriptExecutionToolsOptions } from './JavascriptExecutionToolsOptions';
import { exportToEval } from './utils/exportToEval';
import { preserve } from './utils/preserve';

/**
 * ScriptExecutionTools for JavaScript implemented via eval
 *
 * Warning: It is used for testing and mocking
 *          **NOT intended to use in the production** due to its unsafe nature, use `JavascriptExecutionTools` instead.
 */
export class JavascriptEvalExecutionTools implements ScriptExecutionTools {
    public constructor(private readonly options: JavascriptExecutionToolsOptions) {}

    /**
     * Executes a JavaScript
     */
    public async execute(options: ScriptExecutionToolsExecuteOptions): Promise<string> {
        const { scriptLanguage, parameters } = options;
        let { script } = options;
        const buildinFunctionStatements: Array<string_javascript> = [];

        if (scriptLanguage !== 'javascript') {
            throw new PromptbookExecutionError(
                `Script language ${scriptLanguage} not supported to be executed by JavascriptEvalExecutionTools`,
            );
        }

        // Note: Using direct eval, following variables are in same scope as eval call so they are accessible from inside the evaluated script:

        const _foo = () => 'bar';
        const _trim = (str: string) => str.trim();
        const _reverse = (str: string) => str.split('').reverse().join('');

        console.log(_spaceTrim);

        preserve(_removeQuotes);

        buildinFunctionStatements.push(
            ...exportToEval({
                _foo,

                _removeQuotes,
                _unwrapResult,
                _trimEndOfCodeBlock,
                _trimCodeBlock,
                _trim,
                _reverse,
                _removeEmojis,
                _prettifyMarkdown,

                _spaceTrim,
            }),
        );

        //-------[n12:]---
        const _parseKeywords = (input: string) =>
            Array.from(parseKeywordsFromString(input)).join(
                ', ',
            ); /* <- TODO: [🧠] What is the best format comma list, bullet list,...? */

        buildinFunctionStatements.push(
            ...exportToEval({
                _capitalize,
                _decapitalize,
                _nameToUriPart,
                _nameToUriParts,
                _removeDiacritics,
                _normalizeWhitespaces,
                _normalizeToKebabCase,
                _normalizeTo_camelCase,
                _normalizeTo_snake_case,
                _normalizeTo_PascalCase,
                _parseKeywords,
                _normalizeTo_SCREAMING_CASE,
            }),
        );
        //-------[/n12]---

        if (!script.includes('return')) {
            script = `return ${script}`;
        }

        const customFunctions = this.options.functions || {};
        const customFunctionsStatement = Object.keys(customFunctions)
            .map(
                (functionName) =>
                    // Note: Custom functions are exposed to the current scope as variables
                    `const ${functionName} = customFunctions.${functionName};`,
            )
            .join('\n');

        const statementToEvaluate = _spaceTrim(
            (block) => `

                // Built-in functions:
                ${block(buildinFunctionStatements.join('\n'))}

                // Custom functions:
                ${block(customFunctionsStatement || '// -- No custom functions --')}

                // The script:
                ${block(
                    Object.entries(parameters)
                        .map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`)
                        .join('\n'),
                )}
                (()=>{ ${script} })()
            `,
        );

        if (this.options.isVerbose) {
            console.info(
                _spaceTrim(
                    (block) => `
                        🚀 Evaluating ${scriptLanguage} script:

                        ${block(statementToEvaluate)}`,
                ),
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any;
        try {
            result = await eval(statementToEvaluate);

            if (typeof result !== 'string') {
                throw new PromptbookExecutionError(
                    `Script must return a string, but returned ${result.toString()} ${typeof result}`,
                );
            }
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            if (error instanceof ReferenceError) {
                const undefinedName = error.message.split(' ')[0];
                /*
                Note: Remapping error
                      From: [ReferenceError: thing is not defined],
                      To:   [Error: Parameter {thing} is not defined],
                */

                if (!statementToEvaluate.includes(undefinedName + '(')) {
                    throw new PromptbookExecutionError(
                        _spaceTrim(
                            (block) => `

                                Parameter {${undefinedName}} is not defined

                                This happen during evaluation of the javascript, which has access to the following parameters as javascript variables:

                                ${block(
                                    Object.keys(parameters)
                                        .map((key) => `  - ${key}\n`)
                                        .join(''),
                                )}
                                
                                The script is:
                                \`\`\`javascript
                                ${block(script)}
                                \`\`\`

                                Original error message:
                                ${block((error as Error).message)}


                            `,
                        ),
                    );
                } else {
                    throw new PromptbookExecutionError(
                        _spaceTrim(
                            (block) => `
                                  Function ${undefinedName}() is not defined

                                  -  Make sure that the function is one of built-in functions
                                  -  Or you have to defined the function during construction of JavascriptEvalExecutionTools

                                  Original error message:
                                  ${block((error as Error).message)}

                            `,
                        ),
                    );
                }
            }

            throw error;
        }

        if (typeof result !== 'string') {
            throw new PromptbookExecutionError(`Script must return a string, but returned ${typeof result}`);
        }

        return result;
    }
}

/**
 * TODO: Put predefined functions (like removeQuotes, spaceTrim, etc.) into annotation OR pass into constructor
 * TODO: [🧠][💙] Distinct between options passed into ExecutionTools and to ExecutionTools.execute
 */
