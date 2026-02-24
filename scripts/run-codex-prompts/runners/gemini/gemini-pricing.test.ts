import { GEMINI_MODEL_FOR_ESTIMATION, GEMINI_PRICING, resolveGeminiPricing } from './gemini-pricing';

describe('resolveGeminiPricing', () => {
    it('returns exact model pricing when available', () => {
        expect(resolveGeminiPricing('gemini-1.5-flash')).toEqual(GEMINI_PRICING['gemini-1.5-flash']);
    });

    it('returns prefix match pricing for model variants', () => {
        expect(resolveGeminiPricing('gemini-1.5-flash-preview-0409')).toEqual(GEMINI_PRICING['gemini-1.5-flash']);
    });

    it('falls back to default pricing for unknown models', () => {
        expect(resolveGeminiPricing('gemini-9.9-unknown')).toEqual(GEMINI_PRICING[GEMINI_MODEL_FOR_ESTIMATION]);
    });
});
