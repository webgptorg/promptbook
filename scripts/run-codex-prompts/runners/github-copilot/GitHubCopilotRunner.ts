import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
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
        });

        await $runGoScript({
            scriptPath: options.scriptPath,
            scriptContent,
        });

        return { usage: UNCERTAIN_USAGE };
    }
}
