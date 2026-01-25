import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { PromptRunner, PromptRunOptions, PromptRunResult } from './_PromptRunner';
import { createCodingContext } from './createCodingContext';
import { $runGoScriptWithOutput } from './utils/$runGoScript';
import { parseOpencodeJsonOutput } from './utils/parseOpencodeJsonOutput';

export type OpencodeRunnerOptions = {
    model?: string;
    useOpenAi?: boolean;
    useGoogle?: boolean;
};

export class OpencodeRunner implements PromptRunner {
    public readonly name = 'opencode';

    public constructor(private readonly options: OpencodeRunnerOptions) {}

    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildOpencodeScript({
            prompt: options.prompt,
            model: this.options.model,
            useOpenAi: this.options.useOpenAi,
            useGoogle: this.options.useGoogle,
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

type OpencodeScriptOptions = {
    prompt: string;
    model?: string;
    useOpenAi?: boolean;
    useGoogle?: boolean;
};

function buildOpencodeScript(options: OpencodeScriptOptions): string {
    const delimiter = 'OPENCODE_PROMPT';

    const envVariables: string[] = [];

    // Note: We unset GITHUB_TOKEN to avoid PAT errors when using Copilot model
    envVariables.push('export GITHUB_TOKEN=""');

    if (options.useOpenAi) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        envVariables.push(`export OPENAI_API_KEY="${process.env.OPENAI_API_KEY}"`);
    }

    if (options.useGoogle) {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');
        }
        envVariables.push(`export GOOGLE_GENERATIVE_AI_API_KEY="${process.env.GOOGLE_GENERATIVE_AI_API_KEY}"`);
    }

    return spaceTrim(
        (block) => `
            ${envVariables.join('\n')}

            opencode run${options.model ? ` --model ${options.model}` : ''} --format json <<'${delimiter}'

            ${block(options.prompt)}

            ${block(createCodingContext())}
            

            ${delimiter}
        `,
    );
}
