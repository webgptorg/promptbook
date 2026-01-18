import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path/posix';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { PromptRunner, PromptRunOptions } from './_PromptRunner';
import { buildCodexScript, toPosixPath } from '../run-codex-prompts';

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
        const script = buildCodexScript({
            prompt: options.prompt,
            projectPath: options.projectPath,
            model: this.options.model,
            sandbox: this.options.sandbox,
            askForApproval: this.options.askForApproval,
            codexCommand: this.options.codexCommand,
        });

        await mkdir(dirname(options.scriptPath), { recursive: true });
        await writeFile(options.scriptPath, script, 'utf-8');

        try {
            await $execCommand({
                command: `bash "${toPosixPath(options.scriptPath)}"`,
                isVerbose: true, // <- Note: Proxy the raw command output to the console
            });
        } finally {
            await unlink(options.scriptPath).catch(() => undefined);
        }
    }
}
