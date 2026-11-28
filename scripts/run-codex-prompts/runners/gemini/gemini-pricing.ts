import type { ModelPricing, ModelPricingTable } from '../common/modelPricing';
import { resolveModelPricing } from '../common/modelPricing';

/**
 * The pricing for Gemini models per 1 million tokens in USD.
 *
 * Note: This is an estimation.
 *
 * @see https://ai.google.dev/pricing
 */
export const GEMINI_PRICING = {
    'gemini-1.5-flash': {
        input: 0.1125,
        output: 0.45,
    },
} as const satisfies ModelPricingTable;

/**
 * The model to use for price estimation.
 */
export const GEMINI_MODEL_FOR_ESTIMATION = 'gemini-1.5-flash';

/**
 * Resolves Gemini pricing for the requested model.
 */
export function resolveGeminiPricing(modelName?: string): ModelPricing {
    return resolveModelPricing({
        pricingTable: GEMINI_PRICING,
        modelNameForEstimation: GEMINI_MODEL_FOR_ESTIMATION,
        modelName,
    });
}
