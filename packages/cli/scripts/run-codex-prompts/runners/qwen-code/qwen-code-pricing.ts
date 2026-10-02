import type { ModelPricing, ModelPricingTable } from '../common/modelPricing';
import { resolveModelPricing } from '../common/modelPricing';

/**
 * The pricing for Qwen Code models per 1 million tokens in USD.
 *
 * Note: This is an estimation.
 *
 * @see https://www.alibabacloud.com/help/en/model-studio/models
 */
export const QWEN_CODE_PRICING = {
    'qwen3-coder-plus': {
        input: 1,
        output: 5,
    },
    'qwen3-coder-flash': {
        input: 0.3,
        output: 1.5,
    },
    'qwen3-max': {
        input: 1.2,
        output: 6,
    },
} as const satisfies ModelPricingTable;

/**
 * The model to use for price estimation.
 */
export const QWEN_CODE_MODEL_FOR_ESTIMATION = 'qwen3-coder-plus';

/**
 * Resolves Qwen Code pricing for the requested model.
 */
export function resolveQwenCodePricing(modelName?: string): ModelPricing {
    return resolveModelPricing({
        pricingTable: QWEN_CODE_PRICING,
        modelNameForEstimation: QWEN_CODE_MODEL_FOR_ESTIMATION,
        modelName,
    });
}
