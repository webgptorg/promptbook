import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import type { PromptRunner } from '../types/PromptRunner';
import { buildClaudeScript } from './buildClaudeScript';
import { parseClaudeCodeJsonOutput } from './parseClaudeCodeJsonOutput';

/**
 * Runs prompts via the Claude Code CLI.
 */
export class ClaudeCodeRunner implements PromptRunner {
    public readonly name = 'claude-code';

    /**
     * Creates a new Claude Code runner.
     */
    public constructor() {}

    /**
     * Runs the prompt using Claude Code and parses usage output.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildClaudeScript({
            prompt: options.prompt,
        });

        const output = await $runGoScriptWithOutput({
            scriptPath: options.scriptPath,
            scriptContent,
        });

        const usage = parseClaudeCodeJsonOutput(output);

        return { usage };
    }
}
