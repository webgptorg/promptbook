import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import { PromptRunner, PromptRunOptions, PromptRunResult } from './_PromptRunner';
import { $runGoScript, toPosixPath } from './utils/$runGoScript';
import { createCodingContext } from './createCodingContext';

export class ClineRunner implements PromptRunner {
    public readonly name = 'cline';

    public constructor(
        private readonly options: {
            model: string;
        },
    ) {}

    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const config = {
            apiProvider: 'google-generative-ai',
            modelId: this.options.model,
        };

        const configPath = join(dirname(options.scriptPath), 'cline-config.json');
        await mkdir(dirname(configPath), { recursive: true });
        await writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');

        try {
            const scriptContent = buildClineScript({
                prompt: options.prompt,
                configPath,
            });

            await $runGoScript({
                scriptPath: options.scriptPath,
                scriptContent,
            });

            return { usage: UNCERTAIN_USAGE };
        } finally {
            await unlink(configPath).catch(() => undefined);
        }
    }
}

type ClineScriptOptions = {
    prompt: string;
    configPath: string;
};

function buildClineScript(options: ClineScriptOptions): string {
    const delimiter = 'CLINE_PROMPT';

    return spaceTrim(
        (block) => `
            cline --config "${toPosixPath(options.configPath)}" --yes <<'${delimiter}'

            ${block(options.prompt)}

            ${block(createCodingContext())}

            ${delimiter}
        `,
    );
}
