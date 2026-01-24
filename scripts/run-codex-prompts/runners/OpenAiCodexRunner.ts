import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { PromptRunner, PromptRunOptions, PromptRunResult } from './_PromptRunner';
import { createCodingContext } from './createCodingContext';
import { $runGoScriptUntilMarkerIdle, toPosixPath } from './utils/$runGoScript';

const CODEX_COMPLETION_LINE = /^\s*tokens used\b/i;
const CODEX_COMPLETION_IDLE_MS = 60 * 1000;

/**
 * Runs prompts via the OpenAI Codex CLI.
 */
export class OpenAiCodexRunner implements PromptRunner {
    public readonly name = 'codex';

    /**
     * Creates a new Codex runner.
     */
    public constructor(
        private readonly options: {
            codexCommand: string;
            model: string;
            sandbox: string;
            askForApproval: string;
        },
    ) {}

    /**
     * Runs the Codex prompt in a temporary script and waits for completion output.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildCodexScript({
            prompt: options.prompt,
            projectPath: options.projectPath,
            model: this.options.model,
            sandbox: this.options.sandbox,
            askForApproval: this.options.askForApproval,
            codexCommand: this.options.codexCommand,
        });

        await $runGoScriptUntilMarkerIdle({
            scriptPath: options.scriptPath,
            scriptContent,
            completionLineMatcher: CODEX_COMPLETION_LINE,
            idleTimeoutMs: CODEX_COMPLETION_IDLE_MS,
        });

        return { usage: UNCERTAIN_USAGE };
    }
}

/**
 * Options for building the Codex shell script.
 */
type CodexScriptOptions = {
    prompt: string;
    projectPath: string;
    model: string;
    sandbox: string;
    askForApproval: string;
    codexCommand: string;
};

/**
 * Builds the shell script that runs Codex with the prompt and coding context.
 */
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

            ${block(createCodingContext())}

            ${delimiter}
        `,
    );
}
