import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { PromptRunner, PromptRunOptions, PromptRunResult } from './_PromptRunner';
import { createCodingContext } from './createCodingContext';
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

            ${block(createCodingContext())}
            

            ${delimiter}
        `,
    );

    // <- TODO: Make "Additional context..." conditional: for example "Attached image ..." based on whether images are present
    // <- TODO: Do the adding of additional context to prompts for all runners, do it in a generic way and keep DRY
}
