import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import type { QwenCodeScriptOptions } from './QwenCodeScriptOptions';

/**
 * Delimiter used for passing large prompts to the Qwen Code CLI.
 */
const QWEN_CODE_PROMPT_DELIMITER = 'QWEN_CODE_PROMPT';

/**
 * Builds the shell script that runs Qwen Code with the prompt and coding context.
 *
 * Note: `-y` runs the harness unattended, because `ptbk coder` approves the whole prompt
 *       up front and there is nobody at the keyboard to confirm the single tool calls.
 */
export function buildQwenCodeScript(options: QwenCodeScriptOptions): string {
    return spaceTrim(
        (block) => `
            qwen -y -m ${options.model} -p "$(cat <<'${QWEN_CODE_PROMPT_DELIMITER}'

            ${block(options.prompt)}

            ${QWEN_CODE_PROMPT_DELIMITER}
            )"
        `,
    );
}
