import { SCRIPT_EXECUTION_LOG_RAW_OUTPUT_MARKER } from '../common/runGoScript/scriptExecutionLog';
import { CODER_PING_ANSWER_MARKER } from './buildCoderPingPrompt';

/**
 * Pattern matching one answer line produced by the pinged harness.
 *
 * The captured answer deliberately stops at a quote, a backslash or a line break, so an answer
 * embedded in a JSON event stream — as produced by Claude Code, Opencode or Codex `--json` — is
 * captured without the surrounding JSON.
 */
const CODER_PING_ANSWER_PATTERN = new RegExp(`${CODER_PING_ANSWER_MARKER}\\s*:[ \\t]*([^\\r\\n"\\\\]*)`, 'gu');

/**
 * Extracts the answer of a pinged harness from the runtime log of its runner shell.
 *
 * Only the raw output of the last execution is searched, so the answer marker contained in the
 * prompt of the raw input is never mistaken for the answer of the harness.
 *
 * @returns The answer of the harness, or `null` when the harness produced no recognizable answer
 */
export function extractCoderPingAnswer(runtimeLog: string): string | null {
    const rawOutput = runtimeLog.split(SCRIPT_EXECUTION_LOG_RAW_OUTPUT_MARKER).pop();

    if (rawOutput === undefined) {
        return null;
    }

    // Note: The last answer wins because harnesses which stream partial messages repeat the growing answer line
    const answers = Array.from(rawOutput.matchAll(CODER_PING_ANSWER_PATTERN))
        .map((match) => (match[1] || '').trim())
        .filter((answer) => answer !== '');

    return answers[answers.length - 1] ?? null;
}
