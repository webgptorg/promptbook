import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { toPosixPath } from '../run-codex-prompts';
import { PromptRunner, PromptRunOptions } from './_PromptRunner';

export class ClineRunner implements PromptRunner {
    public readonly name = 'cline';

    public constructor(
        private readonly options: {
            model: string;
        },
    ) {}

    public async runPrompt(options: PromptRunOptions): Promise<void> {
        const config = {
            apiProvider: 'google-generative-ai',
            modelId: this.options.model,
        };

        const configPath = join(dirname(options.scriptPath), 'cline-config.json');
        await mkdir(dirname(configPath), { recursive: true });
        await writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');

        try {
            await $execCommand({
                command: `cline --config "${toPosixPath(configPath)}" --yes "${options.prompt.replace(/"/g, '\\"')}"`,
                isVerbose: true,
            });
        } finally {
            await unlink(configPath).catch(() => undefined);
        }
    }
}
