import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { toPosixPath } from '../../common/runGoScript/toPosixPath';
import type { ClineScriptOptions } from './ClineScriptOptions';

/**
 * Builds the shell script that runs Cline with the prompt and coding context.
 */
export function buildClineScript(options: ClineScriptOptions): string {
    const delimiter = 'CLINE_PROMPT';

    return spaceTrim(
        (block) => `
            cline --config "${toPosixPath(options.configPath)}" --yes <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}
