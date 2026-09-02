import { QWEN_CODE_MODEL_FOR_ESTIMATION, QWEN_CODE_PRICING, resolveQwenCodePricing } from './qwen-code-pricing';

describe('resolveQwenCodePricing', () => {
    it('returns exact model pricing when available', () => {
        expect(resolveQwenCodePricing('qwen3-coder-plus')).toEqual(QWEN_CODE_PRICING['qwen3-coder-plus']);
    });

    it('returns prefix match pricing for model variants', () => {
        expect(resolveQwenCodePricing('qwen3-coder-flash-2026-01-01')).toEqual(QWEN_CODE_PRICING['qwen3-coder-flash']);
    });

    it('falls back to default pricing for unknown models', () => {
        expect(resolveQwenCodePricing('qwen9.9-unknown')).toEqual(QWEN_CODE_PRICING[QWEN_CODE_MODEL_FOR_ESTIMATION]);
    });

    it('falls back to default pricing when no model is requested', () => {
        expect(resolveQwenCodePricing()).toEqual(QWEN_CODE_PRICING[QWEN_CODE_MODEL_FOR_ESTIMATION]);
    });
});
