import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { PromptRunner, PromptRunOptions } from './_PromptRunner';
import { $runGoScript } from './utils/$runGoScript';

export class ClaudeCodeRunner implements PromptRunner {
    public readonly name = 'claude-code';

    public constructor() {}

    public async runPrompt(options: PromptRunOptions): Promise<void> {
        const scriptContent = buildClaudeScript({
            prompt: options.prompt,
        });

        await $runGoScript({
            scriptPath: options.scriptPath,
            scriptContent,
        });
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
