import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import type { PromptRunner } from '../types/PromptRunner';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import { buildQwenCodeScript } from './buildQwenCodeScript';
import { parseQwenCodeUsageFromOutput } from './parseQwenCodeUsageFromOutput';
import type { QwenCodeRunnerOptions } from './QwenCodeRunnerOptions';

/**
 * Default Qwen Code model used by the coding runner.
 */
export const DEFAULT_QWEN_CODE_MODEL = 'qwen3.8-max';

/**
 * Runs prompts via the Qwen Code CLI.
 */
export class QwenCodeRunner implements PromptRunner {
    public readonly name = 'qwen-code';

    /**
     * Creates a new Qwen Code runner.
     */
    public constructor(private readonly options: QwenCodeRunnerOptions) {}

    /**
     * Runs the prompt using Qwen Code and parses usage output.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildQwenCodeScript({
            prompt: options.prompt,
            model: this.options.model,
        });

        const output = await $runGoScriptWithOutput({
            scriptPath: options.scriptPath,
            scriptContent,
            logPath: options.logPath,
            shouldPrintLiveOutput: options.shouldPrintLiveOutput,
            preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess,
        });

        const usage = parseQwenCodeUsageFromOutput(output, options.prompt, this.options.model);

        return { usage };
    }
}
