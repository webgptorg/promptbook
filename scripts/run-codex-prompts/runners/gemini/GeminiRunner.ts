import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import type { PromptRunner } from '../types/PromptRunner';
import { buildGeminiScript } from './buildGeminiScript';
import { parseGeminiUsageFromOutput } from './parseGeminiUsageFromOutput';

/**
 * Runs prompts via the Gemini CLI.
 */
export class GeminiRunner implements PromptRunner {
    public readonly name = 'gemini';

    /**
     * Creates a new Gemini runner.
     */
    public constructor() {}

    /**
     * Runs the prompt using Gemini and parses usage output.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildGeminiScript({
            prompt: options.prompt,
        });

        const output = await $runGoScriptWithOutput({
            scriptPath: options.scriptPath,
            scriptContent,
        });

        const usage = parseGeminiUsageFromOutput(output, options.prompt);

        return { usage };
    }
}

/**
 * TODO !!!!!!??? Images probably arent wotking in Gemini CLI yet
 */
