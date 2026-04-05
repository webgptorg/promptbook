import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { createCodingContext } from '../../common/createCodingContext';
import { toPosixPath } from '../../common/runGoScript/toPosixPath';
import type { GitHubCopilotScriptOptions } from './GitHubCopilotScriptOptions';

/**
 * Builds the shell script that runs GitHub Copilot CLI with the prompt and coding context.
 */
export function buildGitHubCopilotScript(options: GitHubCopilotScriptOptions): string {
    const delimiter = 'GITHUB_COPILOT_PROMPT';
    const projectPath = toPosixPath(options.projectPath);
    const modelArgument = options.model ? ` --model ${options.model}` : '';

    return spaceTrim(
        (block) => `
            cd "${projectPath}"

            copilot -p "$(cat <<'${delimiter}'

            ${block(options.prompt)}

            ${block(createCodingContext())}

            ${delimiter}
            )" \
                --yolo \
                --no-ask-user \
                --no-color \
                --output-format json \
                --stream off${modelArgument}
        `,
    );
}
