import type { PromptRunnerHarnessName } from '../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import { ClaudeCodeRunner } from '../runners/claude-code/ClaudeCodeRunner';
import { ClineRunner } from '../runners/cline/ClineRunner';
import { DEFAULT_GEMINI_MODEL, GeminiRunner } from '../runners/gemini/GeminiRunner';
import { GitHubCopilotRunner } from '../runners/github-copilot/GitHubCopilotRunner';
import { OpenAiCodexRunner } from '../runners/openai-codex/OpenAiCodexRunner';
import { OpencodeRunner } from '../runners/opencode/OpencodeRunner';
import { DEFAULT_QWEN_CODE_MODEL, QwenCodeRunner } from '../runners/qwen-code/QwenCodeRunner';
import { resolvePromptRunner } from './resolvePromptRunner';

jest.mock('../runners/claude-code/ClaudeCodeRunner');
jest.mock('../runners/cline/ClineRunner');
jest.mock('../runners/gemini/GeminiRunner');
jest.mock('../runners/github-copilot/GitHubCopilotRunner');
jest.mock('../runners/openai-codex/OpenAiCodexRunner');
jest.mock('../runners/opencode/OpencodeRunner');
jest.mock('../runners/qwen-code/QwenCodeRunner');

/**
 * Expected defaults at the runner boundary, including the provider-specific model formats.
 */
const HARNESS_MODEL_CASES = [
    ['openai-codex', OpenAiCodexRunner, 'gpt-6-astra'],
    ['github-copilot', GitHubCopilotRunner, 'gpt-6-astra'],
    ['claude-code', ClaudeCodeRunner, 'fable'],
    ['gemini', GeminiRunner, 'gemini-3.8-flash'],
    ['qwen-code', QwenCodeRunner, 'qwen3.8-max'],
    ['opencode', OpencodeRunner, 'openai/gpt-6-astra'],
    ['cline', ClineRunner, 'gemini-3.8-flash'],
] as const;

describe('resolvePromptRunner', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it.each(HARNESS_MODEL_CASES)('uses the flagship for %s when --model is omitted', (agentName, Runner, model) => {
        const { actualRunnerModel, runnerMetadata } = resolvePromptRunner({ agentName, allowCredits: false });

        expect(Runner).toHaveBeenCalledWith(expect.objectContaining({ model }));
        expect(actualRunnerModel).toBe(model);
        expect(runnerMetadata.modelName).toBe(model);
    });

    it.each(HARNESS_MODEL_CASES)('preserves an explicitly chosen model for %s', (agentName, Runner) => {
        const model = 'custom-model';
        const { actualRunnerModel, runnerMetadata } = resolvePromptRunner({ agentName, model, allowCredits: false });

        expect(Runner).toHaveBeenCalledWith(expect.objectContaining({ model }));
        expect(actualRunnerModel).toBe(model);
        expect(runnerMetadata.modelName).toBe(model);
    });

    it.each<PromptRunnerHarnessName>(['github-copilot', 'claude-code', 'opencode'])(
        'keeps the native model configuration for %s with --model default',
        (agentName) => {
            const { actualRunnerModel, runnerMetadata } = resolvePromptRunner({
                agentName,
                model: 'default',
                allowCredits: false,
            });

            expect(actualRunnerModel).toBeUndefined();
            expect(runnerMetadata.modelName).toBeUndefined();
            const [, Runner] = HARNESS_MODEL_CASES.find(([harnessName]) => harnessName === agentName)!;
            expect(Runner).toHaveBeenCalledWith(expect.objectContaining({ model: undefined }));
        },
    );

    it('keeps the model configured in Codex itself for `--model default`', () => {
        const { actualRunnerModel, runnerMetadata } = resolvePromptRunner({
            agentName: 'openai-codex',
            model: 'default',
            allowCredits: false,
        });

        expect(actualRunnerModel).toBeUndefined();
        expect(runnerMetadata).toEqual({ runnerName: 'OpenAI Codex', modelName: undefined });
        expect(OpenAiCodexRunner).toHaveBeenCalledWith(expect.objectContaining({ model: undefined }));
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
        expect(
            resolvePromptRunner({ agentName: 'cline', model: 'default', allowCredits: false }).actualRunnerModel,
        ).toBe(DEFAULT_GEMINI_MODEL);
    });
});
