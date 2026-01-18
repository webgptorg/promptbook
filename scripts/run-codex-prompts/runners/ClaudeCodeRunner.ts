import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { PromptRunner, PromptRunOptions } from './_PromptRunner';

export class ClaudeCodeRunner implements PromptRunner {
    public readonly name = 'claude-code';

    public constructor() {}

    public async runPrompt(options: PromptRunOptions): Promise<void> {
        await $execCommand({
            command: `claude --non-interactive "${options.prompt.replace(/"/g, '\\"')}"`,
            isVerbose: true,
        });
    }
}
