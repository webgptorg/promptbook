import { REPLACING_NONCE } from '../../../constants';

/**
 * Unsafe characters that prevent an inline parameter.
 *
 * @private constant of ParameterEscaping
 */
const INLINE_UNSAFE_PARAMETER_PATTERN = /[\r\n`$'"|<>{};()-*/~+!@#$%^&*\\/[\]]/;

/**
 * Characters that always need escaping for inline placeholders.
 *
 * @private constant of ParameterEscaping
 */
const PROMPT_PARAMETER_ESCAPE_PATTERN = /[`$]/g;

/**
 * Characters that always need escaping when braces are included.
 *
 * @private constant of ParameterEscaping
 */
const PROMPT_PARAMETER_ESCAPE_WITH_BRACES_PATTERN = /[{}$`]/g;

/**
 * Normalizes a JSON string so it can be safely rendered without double escaping.
 *
 * @param value Candidate JSON string.
 * @private function of ParameterEscaping
 */
function normalizeJsonString(value: string): string | null {
    try {
        return JSON.stringify(JSON.parse(value));
    } catch {
        return null;
    }
}

/**
 * Hides brackets in a string to avoid confusion with template parameters.
 *
 * @param value Input string with literal brackets.
 * @private function of ParameterEscaping
 */
function hideBrackets(value: string): string {
    return value
        .split('{')
        .join(`${REPLACING_NONCE}beginbracket`)
        .split('}')
        .join(`${REPLACING_NONCE}endbracket`);
}

/**
 * Restores hidden brackets.
 *
 * @param value String with hidden brackets.
 * @private function of ParameterEscaping
 */
function restoreBrackets(value: string): string {
    return value
        .split(`${REPLACING_NONCE}beginbracket`)
        .join('{')
        .split(`${REPLACING_NONCE}endbracket`)
        .join('}');
}

/**
 * Decides whether a parameter can be inlined safely.
 *
 * @param value Parameter rendered as string.
 * @private function of ParameterEscaping
 */
function shouldInlineParameterValue(value: string): boolean {
    if (value.trim() === '') {
        return false;
    }

    return !INLINE_UNSAFE_PARAMETER_PATTERN.test(value);
}

/**
 * Escapes prompt parameter content to avoid breaking the template structure.
 *
 * @param value Parameter value to escape.
 * @param options Escape options for additional characters.
 * @private function of ParameterEscaping
 */
function escapePromptParameterValue(value: string, options: { includeBraces: boolean }): string {
    const pattern = options.includeBraces
        ? PROMPT_PARAMETER_ESCAPE_WITH_BRACES_PATTERN
        : PROMPT_PARAMETER_ESCAPE_PATTERN;
    return value.replace(pattern, '\\$&');
}

/**
 * Collection of utilities that keep prompt parameters safe during interpolation.
 *
 * @private helper of prompt notation
 */
export const ParameterEscaping = {
    normalizeJsonString,
    hideBrackets,
    restoreBrackets,
    shouldInlineParameterValue,
    escapePromptParameterValue,
};
