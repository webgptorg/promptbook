/**
 * String value found on openai page
 *
 * @private within the library, used only as internal helper for `OPENAI_MODELS` and `computeUsage`
 */
type string_openai_price = `$${number}.${number} / ${number}M tokens`;

/**
 * Function computeUsage will create price per one token based on the string value found on openai page
 *
 * @private within the library, used only as internal helper for `OPENAI_MODELS`
 */
export function computeUsage(value: string_openai_price): number {
    const [price, tokens] = value.split(' / ');

    return parseFloat(price!.replace('$', '')) / parseFloat(tokens!.replace('M tokens', '')) / 1000000;
}
