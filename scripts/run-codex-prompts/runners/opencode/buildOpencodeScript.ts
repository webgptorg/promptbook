import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { createCodingContext } from '../../common/createCodingContext';
import type { OpencodeScriptOptions } from './OpencodeScriptOptions';

/**
 * Builds the shell script that runs Opencode with the prompt and coding context.
 */
export function buildOpencodeScript(options: OpencodeScriptOptions): string {
    const delimiter = 'OPENCODE_PROMPT';

    return spaceTrim(
        (block) => `
            # Note: We unset GITHUB_TOKEN to avoid PAT errors when using Copilot model
            export GITHUB_TOKEN=""

            opencode run${options.model ? ` --model ${options.model}` : ''} --format json <<'${delimiter}'

            ${block(options.prompt)}

            ${block(createCodingContext())}
            

            ${delimiter}
        `,
    );
}
