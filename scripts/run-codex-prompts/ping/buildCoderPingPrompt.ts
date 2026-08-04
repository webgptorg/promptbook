import { spaceTrim } from '../../../src/utils/organization/spaceTrim';

/**
 * Marker the pinged harness is asked to prefix its answer with, so the reply can be recognized
 * in the raw runner output of every supported harness.
 *
 * Note: The marker must stay free of regular-expression metacharacters, because
 *       `extractCoderPingAnswer` builds its pattern from it.
 */
export const CODER_PING_ANSWER_MARKER = 'PTBK-CODER-PING-ANSWER';

/**
 * First factor of the dummy multiplication the pinged harness is asked to compute.
 */
const CODER_PING_FIRST_FACTOR = 6;

/**
 * Second factor of the dummy multiplication the pinged harness is asked to compute.
 */
const CODER_PING_SECOND_FACTOR = 7;

/**
 * Answer a working harness and model returns for the dummy work of `ptbk coder ping`.
 */
export const CODER_PING_EXPECTED_ANSWER = String(CODER_PING_FIRST_FACTOR * CODER_PING_SECOND_FACTOR);

/**
 * Builds the dummy prompt sent by `ptbk coder ping`.
 *
 * The work is intentionally the smallest possible one that still reaches the model: it spends a
 * negligible amount of the harness quota, it needs no tool and it explicitly forbids touching the
 * project, so a ping leaves the project exactly as it was.
 */
export function buildCoderPingPrompt(): string {
    return spaceTrim(`
        # Promptbook connection check

        This is an automated \`ptbk coder ping\` connection check, not a coding task.

        Do exactly this and nothing else:

        1. Multiply \`${CODER_PING_FIRST_FACTOR}\` by \`${CODER_PING_SECOND_FACTOR}\`.
        2. Answer with one single line \`${CODER_PING_ANSWER_MARKER}: <result>\` where \`<result>\` is the number you computed.

        Rules:

        - Do not read, create, change, move or delete any file.
        - Do not run any command and do not use any tool.
        - Do not write anything except the single answer line.
    `);
}
