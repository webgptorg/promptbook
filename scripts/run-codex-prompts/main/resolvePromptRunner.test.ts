import { DEFAULT_GEMINI_MODEL } from '../runners/gemini/GeminiRunner';
import { DEFAULT_QWEN_CODE_MODEL } from '../runners/qwen-code/QwenCodeRunner';
import { resolvePromptRunner } from './resolvePromptRunner';

describe('resolvePromptRunner', () => {
    it('keeps the model configured in Codex itself for `--model default`', () => {
        const { actualRunnerModel, runnerMetadata } = resolvePromptRunner({
            agentName: 'openai-codex',
            model: 'default',
            allowCredits: false,
        });

        expect(actualRunnerModel).toBeUndefined();
        expect(runnerMetadata).toEqual({ runnerName: 'OpenAI Codex', modelName: undefined });
    });

    it('passes an explicitly named model to Codex', () => {
        const { actualRunnerModel, runnerMetadata } = resolvePromptRunner({
            agentName: 'openai-codex',
            model: 'gpt-5.2-codex',
            allowCredits: false,
        });

        expect(actualRunnerModel).toBe('gpt-5.2-codex');
        expect(runnerMetadata).toEqual({ runnerName: 'OpenAI Codex', modelName: 'gpt-5.2-codex' });
    });

    it('still resolves `--model default` to a concrete model for harnesses which need one', () => {
        expect(
            resolvePromptRunner({ agentName: 'gemini', model: 'default', allowCredits: false }).actualRunnerModel,
        ).toBe(DEFAULT_GEMINI_MODEL);
        expect(
            resolvePromptRunner({ agentName: 'qwen-code', model: 'default', allowCredits: false }).actualRunnerModel,
        ).toBe(DEFAULT_QWEN_CODE_MODEL);
    });
});
