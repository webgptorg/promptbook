import { HARNESS_DEFAULT_MODELS } from '../../../../src/cli/cli-commands/common/harness/HARNESS_DEFAULT_MODELS';
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
export const DEFAULT_QWEN_CODE_MODEL = HARNESS_DEFAULT_MODELS['qwen-code'];

/**
 * Runs prompts via the Qwen Code CLI.
 */
export class QwenCodeRunner implements PromptRunner {
    /** TEAM uses this harness's existing command tool, with the same permissions as its caller. */
    public readonly teamCapability = 'command-tools' as const;
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
            projectPath: options.projectPath,
            scriptPath: options.scriptPath,
            signal: options.signal,
            environment: options.environment,
            scriptContent,
            logPath: options.logPath,
            shouldPrintLiveOutput: options.shouldPrintLiveOutput,
            preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess,
        });

        const usage = parseQwenCodeUsageFromOutput(output, options.prompt, this.options.model);

        return { usage };
    }
}
