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

    return spaceTrim(
        (block) => `
            ${options.codexCommand} \\
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
