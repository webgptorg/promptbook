// Note: [💎]
import _spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { ScriptExecutionTools, ScriptExecutionToolsExecuteOptions } from '../../execution/ScriptExecutionTools';
import { extractBlock } from '../../postprocessing/utils/extractBlock';
import { prettifyMarkdown as _prettifyMarkdown } from '../../utils/markdown/prettifyMarkdown';
import { capitalize as _capitalize } from '../../utils/normalization/capitalize';
import { decapitalize as _decapitalize } from '../../utils/normalization/decapitalize';
import { nameToUriPart as _nameToUriPart } from '../../utils/normalization/nameToUriPart';
import { nameToUriParts as _nameToUriParts } from '../../utils/normalization/nameToUriParts';
import { normalizeToKebabCase as _normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import { normalizeTo_PascalCase as _normalizeTo_PascalCase } from '../../utils/normalization/normalizeTo_PascalCase';
import { normalizeTo_SCREAMING_CASE as _normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { normalizeTo_camelCase as _normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import { normalizeTo_snake_case as _normalizeTo_snake_case } from '../../utils/normalization/normalizeTo_snake_case';
import { normalizeWhitespaces as _normalizeWhitespaces } from '../../utils/normalization/normalizeWhitespaces';
import { parseKeywordsFromString } from '../../utils/normalization/parseKeywordsFromString';
import { removeDiacritics as _removeDiacritics } from '../../utils/normalization/removeDiacritics';
import { TODO_any } from '../../utils/organization/TODO_any';
import { removeEmojis as _removeEmojis } from '../../utils/removeEmojis';
import { removeQuotes as _removeQuotes } from '../../utils/removeQuotes';
import { trimCodeBlock as _trimCodeBlock } from '../../utils/trimCodeBlock';
import { trimEndOfCodeBlock as _trimEndOfCodeBlock } from '../../utils/trimEndOfCodeBlock';
import { unwrapResult as _unwrapResult } from '../../utils/unwrapResult';
import type { JavascriptExecutionToolsOptions } from './JavascriptExecutionToolsOptions';
import { preserve } from './utils/preserve';
import { unknownToString } from './utils/unknownToString';

/**
 * ScriptExecutionTools for JavaScript implemented via eval
 *
 * Warning: It is used for testing and mocking
 *          **NOT intended to use in the production** due to its unsafe nature, use `JavascriptExecutionTools` instead.
 *
 * @public exported from `@promptbook/execute-javascript`
 */
export class JavascriptEvalExecutionTools implements ScriptExecutionTools {
    private readonly options: JavascriptExecutionToolsOptions;

    public constructor(options?: JavascriptExecutionToolsOptions) {
        this.options = options || {};
    }

    /**
     * Executes a JavaScript
     */
    public async execute(options: ScriptExecutionToolsExecuteOptions): Promise<string> {
        const { scriptLanguage, parameters } = options;
        let { script } = options;

        if (scriptLanguage !== 'javascript') {
            throw new PipelineExecutionError(
                `Script language ${scriptLanguage} not supported to be executed by JavascriptEvalExecutionTools`,
            );
        }

        // Note: [💎]
        // Note: Using direct eval, following variables are in same scope as eval call so they are accessible from inside the evaluated script:

        const spaceTrim = (_: TODO_any) => _spaceTrim(_);
        preserve(spaceTrim);

        const removeQuotes = _removeQuotes;
        preserve(removeQuotes);

        const unwrapResult = _unwrapResult;
        preserve(unwrapResult);

        const trimEndOfCodeBlock = _trimEndOfCodeBlock;
        preserve(trimEndOfCodeBlock);

        const trimCodeBlock = _trimCodeBlock;
        preserve(trimCodeBlock);

        // TODO: DRY [🍯]
        const trim = (str: string) => str.trim();
        preserve(trim);

        // TODO: DRY [🍯]
        const reverse = (str: string) => str.split('').reverse().join('');
        preserve(reverse);

        const removeEmojis = _removeEmojis;
        preserve(removeEmojis);

        const prettifyMarkdown = _prettifyMarkdown;
        preserve(prettifyMarkdown);

        //-------[n12:]---
        const capitalize = _capitalize;
        const decapitalize = _decapitalize;
        const nameToUriPart = _nameToUriPart;
        const nameToUriParts = _nameToUriParts;
        const removeDiacritics = _removeDiacritics;
        const normalizeWhitespaces = _normalizeWhitespaces;
        const normalizeToKebabCase = _normalizeToKebabCase;
        const normalizeTo_camelCase = _normalizeTo_camelCase;
        const normalizeTo_snake_case = _normalizeTo_snake_case;
        const normalizeTo_PascalCase = _normalizeTo_PascalCase;
        const parseKeywords = (input: string) =>
            // TODO: DRY [🍯]
            Array.from(parseKeywordsFromString(input)).join(
                ', ',
            ); /* <- TODO: [🧠] What is the best format comma list, bullet list,...? */
        const normalizeTo_SCREAMING_CASE = _normalizeTo_SCREAMING_CASE;
        preserve(capitalize);
        preserve(decapitalize);
        preserve(nameToUriPart);
        preserve(nameToUriParts);
        preserve(removeDiacritics);
        preserve(normalizeWhitespaces);
        preserve(normalizeToKebabCase);
        preserve(normalizeTo_camelCase);
        preserve(normalizeTo_snake_case);
        preserve(normalizeTo_PascalCase);
        preserve(parseKeywords);
        preserve(normalizeTo_SCREAMING_CASE);
        //-------[/n12]---

        if (!script.includes('return')) {
            script = `return ${script}`;
        }

        // TODO: DRY [🍯]
        const buildinFunctions = {
            // TODO: [🍯] DRY all these functions across the file
            spaceTrim,
            removeQuotes,
            unwrapResult,
            trimEndOfCodeBlock,
            trimCodeBlock,
            trim,
            reverse,
            removeEmojis,
            prettifyMarkdown,
            capitalize,
            decapitalize,
            nameToUriPart,
            nameToUriParts,
            removeDiacritics,
            normalizeWhitespaces,
            normalizeToKebabCase,
            normalizeTo_camelCase,
            normalizeTo_snake_case,
            normalizeTo_PascalCase,
            parseKeywords,
            normalizeTo_SCREAMING_CASE,
            extractBlock, // <- [🍓] Remove balast in all other functions, use this one as example
        };
        const buildinFunctionsStatement = Object.keys(buildinFunctions)
            .map(
                (functionName) =>
                    // Note: Custom functions are exposed to the current scope as variables
                    `const ${functionName} = buildinFunctions.${functionName};`,
            )
            .join('\n');

        // TODO: DRY [🍯]
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

                // Build-in functions:
                ${block(buildinFunctionsStatement)}

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

        let result: TODO_any;
        try {
            result = await eval(statementToEvaluate);

            if (typeof result !== 'string') {
                throw new PipelineExecutionError(
                    `Script must return a string, but returned ${unknownToString(result)}`,
                );
            }
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            if (error instanceof PipelineUrlError) {
                const undefinedName = error.message.split(' ')[0];
                /*
                Note: Remapping error
                      From: [PipelineUrlError: thing is not defined],
                      To:   [PipelineExecutionError: Parameter {thing} is not defined],
                */

                if (!statementToEvaluate.includes(undefinedName + '(')) {
                    throw new PipelineExecutionError(
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
                    throw new PipelineExecutionError(
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
            throw new PipelineExecutionError(`Script must return a string, but ${unknownToString(result)}`);
        }

        return result;
    }
}

/**
 * TODO: Put predefined functions (like removeQuotes, spaceTrim, etc.) into annotation OR pass into constructor
 * TODO: [🧠][💙] Distinct between options passed into ExecutionTools and to ExecutionTools.execute
 */
