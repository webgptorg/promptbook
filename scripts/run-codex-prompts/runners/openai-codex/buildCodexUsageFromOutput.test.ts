import { OPENAI_MODELS } from '../../../../src/llm-providers/openai/openai-models';
import {
    DEFAULT_CODEX_COMPLETION_SHARE,
    buildCodexUsageFromOutput,
} from './buildCodexUsageFromOutput';

describe('buildCodexUsageFromOutput', () => {
    const getMiniCodexPricing = () => {
        const miniModel = OPENAI_MODELS.find((model) => model.modelName === 'gpt-5.1-codex-mini');
        if (!miniModel?.pricing) {
            throw new Error('Missing gpt-5.1-codex-mini pricing configuration');
        }
        return miniModel.pricing;
    };

    it('uses the reported prompt/completion counts when both are available', () => {
        const output = `
tokens used
  total 100
  prompt 80
  completion 20
`;

        const usage = buildCodexUsageFromOutput(output, 'gpt-5.1-codex-mini');
        const pricing = getMiniCodexPricing();
        expect(usage.price.value).toBeCloseTo(80 * pricing.prompt + 20 * pricing.output);
        expect(usage.price.isUncertain).toBeUndefined();
        expect(usage.input.tokensCount.value).toBe(100);
        expect(usage.output.tokensCount.value).toBe(20);
        expect(usage.output.tokensCount.isUncertain).toBeUndefined();
    });

    it('falls back to the shared completion share when only total is reported', () => {
        const totalTokens = 1_000;
        const output = `
tokens used
  ${totalTokens.toLocaleString()} total
`;

        const usage = buildCodexUsageFromOutput(output, 'gpt-5.1-codex-mini');
        const pricing = getMiniCodexPricing();
        const completionTokens = Math.round(totalTokens * DEFAULT_CODEX_COMPLETION_SHARE);
        const promptTokens = totalTokens - completionTokens;

        expect(usage.price.value).toBeCloseTo(promptTokens * pricing.prompt + completionTokens * pricing.output);
        expect(usage.price.isUncertain).toBe(true);
        expect(usage.input.tokensCount.value).toBe(totalTokens);
        expect(usage.input.tokensCount.isUncertain).toBeUndefined();
        expect(usage.output.tokensCount.value).toBe(completionTokens);
        expect(usage.output.tokensCount.isUncertain).toBe(true);
    });

    it('deduces prompt tokens when only completion and total are reported', () => {
        const output = `
tokens used
  200
  completion 60
`;

        const usage = buildCodexUsageFromOutput(output, 'gpt-5.1-codex-mini');
        const pricing = getMiniCodexPricing();
        expect(usage.price.value).toBeCloseTo(140 * pricing.prompt + 60 * pricing.output);
        expect(usage.price.isUncertain).toBeUndefined();
        expect(usage.input.tokensCount.value).toBe(200);
        expect(usage.output.tokensCount.value).toBe(60);
        expect(usage.output.tokensCount.isUncertain).toBeUndefined();
    });
});
