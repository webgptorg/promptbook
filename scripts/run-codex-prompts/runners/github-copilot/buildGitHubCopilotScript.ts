import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { resolveShellHereDocumentDelimiter } from '../../common/runGoScript/resolveShellHereDocumentDelimiter';
import { toPosixPath } from '../../common/runGoScript/toPosixPath';
import type { GitHubCopilotScriptOptions } from './GitHubCopilotScriptOptions';

/**
 * Builds the shell script that runs GitHub Copilot CLI with the prompt and coding context.
 */
export function buildGitHubCopilotScript(options: GitHubCopilotScriptOptions): string {
    const delimiter = resolveShellHereDocumentDelimiter('GITHUB_COPILOT_PROMPT', options.prompt);
    const projectPath = toPosixPath(options.projectPath);
    const modelArgument = options.model ? ` --model ${options.model}` : '';
    const thinkingLevelArgument = options.thinkingLevel ? ` --reasoning-effort ${options.thinkingLevel}` : '';

    return spaceTrim(
        (block) => `
            cd "${projectPath}"

            if [ -f .env ]; then
            set -a
            source .env
            set +a
            fi

            unset GITHUB_TOKEN

            # Avoid passing the prompt as one CLI argument because large agent prompts can exceed Windows/MSYS limits.
            copilot \\
                --yolo \\
                --no-ask-user \\
                --no-color \\
                --output-format json \\
                --stream off${modelArgument}${thinkingLevelArgument} \\
                <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}
