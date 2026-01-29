import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import type { PromptRunner } from '../types/PromptRunner';
import { buildOpencodeScript } from './buildOpencodeScript';
import type { OpencodeRunnerOptions } from './OpencodeRunnerOptions';
import { parseOpencodeJsonOutput } from './parseOpencodeJsonOutput';

/**
 * Runs prompts via the Opencode CLI.
 */
export class OpencodeRunner implements PromptRunner {
    public readonly name = 'opencode';

    /**
     * Creates a new Opencode runner.
     */
    public constructor(private readonly options: OpencodeRunnerOptions) {}

    /**
     * Runs the prompt using Opencode and parses usage output.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildOpencodeScript({
            prompt: options.prompt,
            model: this.options.model,
        });

        let output: string;
        try {
            output = await $runGoScriptWithOutput({
                scriptPath: options.scriptPath,
                scriptContent,
            });
        } catch (error) {
            if (error instanceof Error) {
                output = error.message;
            } else {
                throw error;
            }
        }

        const usage = parseOpencodeJsonOutput(output);

        return { usage };
    }
}
