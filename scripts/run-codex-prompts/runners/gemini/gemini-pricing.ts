/**
 * The pricing for Gemini models per 1 million tokens in USD.
 *
 * Note: This is an estimation.
 * @see https://ai.google.dev/pricing
 */
export const GEMINI_PRICING = {
    'gemini-1.5-flash': {
        input: 0.1125,
        output: 0.45,
    },
};

/**
 * The model to use for price estimation.
 */
export const GEMINI_MODEL_FOR_ESTIMATION = 'gemini-1.5-flash';

/**
 * A an estimation of how many characters are in one token.
 */
export const CHARS_PER_TOKEN = 4;
