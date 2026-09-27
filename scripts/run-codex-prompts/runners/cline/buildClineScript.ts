import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { resolveShellHereDocumentDelimiter } from '../../common/runGoScript/resolveShellHereDocumentDelimiter';
import { toPosixPath } from '../../common/runGoScript/toPosixPath';
import type { ClineScriptOptions } from './ClineScriptOptions';

/**
 * Builds the shell script that runs Cline with the prompt and coding context.
 */
export function buildClineScript(options: ClineScriptOptions): string {
    const delimiter = resolveShellHereDocumentDelimiter('CLINE_PROMPT', options.prompt);

    return spaceTrim(
        (block) => `
            cline --config "${toPosixPath(options.configPath)}" --yes <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}
