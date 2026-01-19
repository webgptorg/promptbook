import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { PromptRunner, PromptRunOptions } from './_PromptRunner';
import { $runGoScript, toPosixPath } from './utils/$runGoScript';

export class OpenAiCodexRunner implements PromptRunner {
    public readonly name = 'codex';

    public constructor(
        private readonly options: {
            codexCommand: string;
            model: string;
            sandbox: string;
            askForApproval: string;
        },
    ) {}

    public async runPrompt(options: PromptRunOptions): Promise<void> {
        const scriptContent = buildCodexScript({
            prompt: options.prompt,
            projectPath: options.projectPath,
            model: this.options.model,
            sandbox: this.options.sandbox,
            askForApproval: this.options.askForApproval,
            codexCommand: this.options.codexCommand,
        });

        await $runGoScript({
            scriptPath: options.scriptPath,
            scriptContent,
        });
    }
}

type CodexScriptOptions = {
    prompt: string;
    projectPath: string;
    model: string;
    sandbox: string;
    askForApproval: string;
    codexCommand: string;
};

function buildCodexScript(options: CodexScriptOptions): string {
    const delimiter = 'CODEX_PROMPT';
    const projectPath = toPosixPath(options.projectPath);

    return spaceTrim(
        (block) => `
            ${options.codexCommand} \\
              --ask-for-approval ${options.askForApproval} \\
              exec --model ${options.model} \\
              --sandbox ${options.sandbox} \\
              -C ${projectPath} \\
              <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}
