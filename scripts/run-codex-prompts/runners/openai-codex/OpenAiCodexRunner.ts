import { $runGoScriptUntilMarkerIdle } from '../../common/runGoScript/$runGoScriptUntilMarkerIdle';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import type { PromptRunner } from '../types/PromptRunner';
import { buildCodexScript } from './buildCodexScript';
import { buildCodexUsageFromOutput } from './buildCodexUsageFromOutput';
import type { OpenAiCodexRunnerOptions } from './OpenAiCodexRunnerOptions';

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
    public constructor(private readonly options: OpenAiCodexRunnerOptions) {}

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

        const output = await $runGoScriptUntilMarkerIdle({
            scriptPath: options.scriptPath,
            scriptContent,
            completionLineMatcher: CODEX_COMPLETION_LINE,
            idleTimeoutMs: CODEX_COMPLETION_IDLE_MS,
        });

        return { usage: buildCodexUsageFromOutput(output, this.options.model) };
    }
}
