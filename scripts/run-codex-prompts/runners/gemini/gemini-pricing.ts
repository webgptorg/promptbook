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
 * Gemini pricing entry per 1 million tokens.
 */
export type GeminiPricing = {
    input: number;
    output: number;
};

/**
 * Resolves Gemini pricing for the requested model.
 *
 * It first tries exact match, then prefix match, then falls back to a stable
 * default pricing model.
 */
export function resolveGeminiPricing(modelName?: string): GeminiPricing {
    const fallbackPricing = GEMINI_PRICING[GEMINI_MODEL_FOR_ESTIMATION as keyof typeof GEMINI_PRICING];

    if (!modelName) {
        return fallbackPricing;
    }

    const exactMatch = GEMINI_PRICING[modelName as keyof typeof GEMINI_PRICING];
    if (exactMatch) {
        return exactMatch;
    }

    const prefixMatch = Object.entries(GEMINI_PRICING).find(([knownModel]) => modelName.startsWith(knownModel))?.[1];
    return prefixMatch ?? fallbackPricing;
}

/**
 * A an estimation of how many characters are in one token.
 */
export const CHARS_PER_TOKEN = 4;
