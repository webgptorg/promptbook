import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { PromptRunner, PromptRunOptions, PromptRunResult } from './_PromptRunner';
import { $runGoScriptWithOutput } from './utils/$runGoScript';
import { parseClaudeCodeJsonOutput } from './utils/parseClaudeCodeJsonOutput';

export class ClaudeCodeRunner implements PromptRunner {
    public readonly name = 'claude-code';

    public constructor() {}

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

type ClaudeScriptOptions = {
    prompt: string;
};

function buildClaudeScript(options: ClaudeScriptOptions): string {
    const delimiter = 'CLAUDE_PROMPT';

    return spaceTrim(
        (block) => `
            claude --allowedTools "Bash,Read,Edit,Write" --output-format json --print <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}
