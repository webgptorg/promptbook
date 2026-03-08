import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { createCodingContext } from '../../common/createCodingContext';
import { toPosixPath } from '../../common/runGoScript/toPosixPath';
import type { CodexScriptOptions } from './CodexScriptOptions';

/**
 * Builds the shell script that runs Codex with the prompt and coding context.
 */
export function buildCodexScript(options: CodexScriptOptions): string {
    const delimiter = 'CODEX_PROMPT';
    const projectPath = toPosixPath(options.projectPath);
    const loginMethodConfig = options.allowCredits ? '' : '  -c forced_login_method=chatgpt \\';

    return spaceTrim(
        (block) => `
            ${options.codexCommand} \\
              ${loginMethodConfig}
              --ask-for-approval ${options.askForApproval} \\
              exec --model ${options.model} \\
              --local-provider none \\
              --sandbox ${options.sandbox} \\
              -C ${projectPath} \\
              <<'${delimiter}'

            ${block(options.prompt)}

            ${block(createCodingContext())}

            ${delimiter}
        `,
    );
}
