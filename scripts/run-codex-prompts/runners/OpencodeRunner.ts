import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { PromptRunner, PromptRunOptions, PromptRunResult } from './_PromptRunner';
import { createCodingContext } from './createCodingContext';
import { $runGoScriptWithOutput } from './utils/$runGoScript';
import { parseOpencodeJsonOutput } from './utils/parseOpencodeJsonOutput';

export type OpencodeRunnerOptions = {
    model: string;
};

export class OpencodeRunner implements PromptRunner {
    public readonly name = 'opencode';

    public constructor(private readonly options: OpencodeRunnerOptions) {}

    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildOpencodeScript({
            prompt: options.prompt,
            model: this.options.model,
        });

        const output = await $runGoScriptWithOutput({
            scriptPath: options.scriptPath,
            scriptContent,
        });

        const usage = parseOpencodeJsonOutput(output);

        return { usage };
    }
}

type OpencodeScriptOptions = {
    prompt: string;
    model: string;
};

function buildOpencodeScript(options: OpencodeScriptOptions): string {
    const delimiter = 'OPENCODE_PROMPT';

    return spaceTrim(
        (block) => `
            opencode run --model ${options.model} --format json <<'${delimiter}'

            ${block(options.prompt)}

            ${block(createCodingContext())}
            

            ${delimiter}
        `,
    );
}
