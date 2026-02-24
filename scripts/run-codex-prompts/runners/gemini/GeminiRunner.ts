import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import type { PromptRunner } from '../types/PromptRunner';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import { buildGeminiScript } from './buildGeminiScript';
import type { GeminiRunnerOptions } from './GeminiRunnerOptions';
import { parseGeminiUsageFromOutput } from './parseGeminiUsageFromOutput';

/**
 * Default Gemini model used by the coding runner.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-pro-preview';

/**
 * Runs prompts via the Gemini CLI.
 */
export class GeminiRunner implements PromptRunner {
    public readonly name = 'gemini';

    /**
     * Creates a new Gemini runner.
     */
    public constructor(private readonly options: GeminiRunnerOptions) {}

    /**
     * Runs the prompt using Gemini and parses usage output.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildGeminiScript({
            prompt: options.prompt,
            model: this.options.model,
        });

        const output = await $runGoScriptWithOutput({
            scriptPath: options.scriptPath,
            scriptContent,
        });

        const usage = parseGeminiUsageFromOutput(output, options.prompt);

        return { usage };
    }
}
