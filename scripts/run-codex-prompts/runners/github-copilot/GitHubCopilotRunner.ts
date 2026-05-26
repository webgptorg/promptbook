import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
import { EnvironmentMismatchError } from '../../../../src/errors/EnvironmentMismatchError';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { $runGoScript } from '../../common/runGoScript/$runGoScript';
import type { PromptRunner } from '../types/PromptRunner';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import { buildGitHubCopilotScript } from './buildGitHubCopilotScript';
import type { GitHubCopilotRunnerOptions } from './GitHubCopilotRunnerOptions';

/**
 * Runs prompts via the GitHub Copilot CLI.
 */
export class GitHubCopilotRunner implements PromptRunner {
    public readonly name = 'github-copilot';

    /**
     * Creates a new GitHub Copilot runner.
     */
    public constructor(private readonly options: GitHubCopilotRunnerOptions) {}

    /**
     * Runs the prompt using GitHub Copilot CLI.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildGitHubCopilotScript({
            prompt: options.prompt,
            projectPath: options.projectPath,
            model: this.options.model,
            thinkingLevel: this.options.thinkingLevel,
        });

        try {
            await $runGoScript({
                scriptPath: options.scriptPath,
                scriptContent,
                logPath: options.logPath,
                preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess,
            });
        } catch (error) {
            throw normalizeGitHubCopilotRunnerError(error);
        }

        return { usage: UNCERTAIN_USAGE };
    }
}

/**
 * Rewrites known GitHub Copilot CLI shell-wrapper failures into a more actionable Promptbook error.
 */
function normalizeGitHubCopilotRunnerError(error: unknown): Error {
    if (!(error instanceof Error)) {
        return new Error(String(error));
    }

    if (!isGitHubCopilotArgumentLimitError(error)) {
        return error;
    }

    return new EnvironmentMismatchError(
        spaceTrim(
            (block) => `
                GitHub Copilot CLI failed before it could process the Promptbook agent prompt.

                On Windows/MSYS this usually means the Copilot shell wrapper still hit an argument-length limit and the underlying Node launcher never started.

                ### Copilot CLI output
                \`\`\`
                ${block(error.message)}
                \`\`\`

                ### What to check
                - Update to the newest \`ptbk\` package so \`ptbk agent-folder run\` uses the compiled agent-system-message prompt shape.
                - Keep the local agent instructions in \`agent.book\` reasonably compact.
                - If needed, compare with the local source runner (\`ts-node src/cli/test/ptbk.ts agent-folder run ...\`), which bypasses stale published bundles.
            `,
        ),
    );
}

/**
 * Detects the Windows/MSYS GitHub Copilot wrapper failure that reports `Argument list too long`.
 */
function isGitHubCopilotArgumentLimitError(error: Error): boolean {
    return (
        error.message.includes('copilot:') &&
        error.message.includes('Argument list too long') &&
        error.message.includes('bin/node')
    );
}
