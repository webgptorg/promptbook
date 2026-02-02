import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { createCodingContext } from '../../common/createCodingContext';
import type { GeminiScriptOptions } from './GeminiScriptOptions';

/**
 * Builds the shell script that runs Gemini with the prompt and coding context.
 */
export function buildGeminiScript(options: GeminiScriptOptions): string {
    const delimiter = 'GEMINI_PROMPT';

    return spaceTrim(
        (block) => `
            gemini -y -p "$(cat <<'${delimiter}'

            ${block(options.prompt)}

            ${block(createCodingContext())}
            

            ${delimiter}
            )"
        `,
    );
}
