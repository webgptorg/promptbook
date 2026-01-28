import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
import { $runGoScript } from '../../common/runGoScript/$runGoScript';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import type { PromptRunner } from '../types/PromptRunner';
import { buildClineScript } from './buildClineScript';
import type { ClineRunnerOptions } from './ClineRunnerOptions';

/**
 * Runs prompts via the Cline CLI.
 */
export class ClineRunner implements PromptRunner {
    public readonly name = 'cline';

    /**
     * Creates a new Cline runner.
     */
    public constructor(private readonly options: ClineRunnerOptions) {}

    /**
     * Runs the prompt using the Cline CLI.
     */
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
