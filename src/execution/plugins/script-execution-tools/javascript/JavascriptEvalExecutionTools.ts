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
import { spaceTrim as _spaceTrim } from 'spacetrim';
import { removeEmojis as _removeEmojis } from '../../../../utils/removeEmojis';
import { removeQuotes as _removeQuotes } from '../../../../utils/removeQuotes';
import { unwrapResult as _unwrapResult } from '../../../../utils/unwrapResult';
import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';
import { ScriptExecutionTools, ScriptExecutionToolsExecuteOptions } from '../../../ScriptExecutionTools';

/**
 * ScriptExecutionTools for JavaScript implemented via eval
 *
 * Warning: It is used for testing and mocking
 *          **NOT intended to use in the production** due to its unsafe nature, use `JavascriptExecutionTools` instead.
 */
export class JavascriptEvalExecutionTools implements ScriptExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions) {
        // TODO: !!! This should NOT work in node + explain
    }

    /**
     * Executes a JavaScript
     */
    public async execute(options: ScriptExecutionToolsExecuteOptions): Promise<string> {
        const { scriptLanguage, parameters } = options;
        let { script } = options;

        if (scriptLanguage !== 'javascript') {
            throw new Error(
                `Script language ${scriptLanguage} not supported to be executed by JavascriptEvalExecutionTools`,
            );
        }

        // Note: Using direct eval, following variables are in same scope as eval call so they are accessible from inside the evaluated script:
        const spaceTrim = _spaceTrim;
        spaceTrim;
        const removeQuotes = _removeQuotes;
        removeQuotes;
        const unwrapResult = _unwrapResult;
        unwrapResult;
        const trim = (str: string) => str.trim();
        trim;
        const reverse = (str: string) => str.split('').reverse().join('');
        reverse;
        const removeEmojis = _removeEmojis;
        removeEmojis;

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
            Array.from(parseKeywordsFromString(input)).join(
                ', ',
            ); /* <- TODO: [🧠] What is the best format comma list, bullet list,...? */
        const normalizeTo_SCREAMING_CASE = _normalizeTo_SCREAMING_CASE;
        capitalize;
        decapitalize;
        nameToUriPart;
        nameToUriParts;
        removeDiacritics;
        normalizeWhitespaces;
        normalizeToKebabCase;
        normalizeTo_camelCase;
        normalizeTo_snake_case;
        normalizeTo_PascalCase;
        parseKeywords;
        normalizeTo_SCREAMING_CASE;
        //-------[/n12]---

        if (!script.includes('return')) {
            script = `return ${script}`;
        }

        const statementToEvaluate = spaceTrim(
            (block) => `
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
                spaceTrim(
                    (block) => `
                        🚀 Evaluating ${scriptLanguage} script:

                        ${block(statementToEvaluate)}`,
                ),
            );
        }

        const result = eval(statementToEvaluate);

        if (typeof result !== 'string') {
            throw new Error(`Script must return a string, but returned ${typeof result}`);
        }

        return result;
    }
}

/**
 * TODO: Put predefined functions (like removeQuotes, spaceTrim, etc.) into annotation OR pass into constructor
 */
