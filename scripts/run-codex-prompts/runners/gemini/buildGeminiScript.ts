import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { resolveShellHereDocumentDelimiter } from '../../common/runGoScript/resolveShellHereDocumentDelimiter';
import type { GeminiScriptOptions } from './GeminiScriptOptions';

/**
 * Builds the shell script that runs Gemini with the prompt and coding context.
 */
export function buildGeminiScript(options: GeminiScriptOptions): string {
    const delimiter = resolveShellHereDocumentDelimiter('GEMINI_PROMPT', options.prompt);

    return spaceTrim(
        (block) => `
            gemini -y -m ${options.model} -p "$(cat <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
            )"
        `,
    );
}
