import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { CODER_PING_ANSWER_MARKER } from './buildCoderPingPrompt';
import { extractCoderPingAnswer } from './extractCoderPingAnswer';

/**
 * Builds one runtime log section in the shape `appendScriptExecutionLogStart` writes it.
 */
function buildRuntimeLogSection(rawOutput: string): string {
    return spaceTrim(
        (block) => `
            === runner shell started at 2026-08-04T00:00:00.000Z ===
            Script path: /project/.promptbook/coder-ping/ping.sh

            --- raw input ---
            codex exec <<'CODEX_PROMPT'
            Answer with one single line \`${CODER_PING_ANSWER_MARKER}: <result>\` where \`<result>\` is the number you computed.
            CODEX_PROMPT

            --- raw output ---
            ${block(rawOutput)}
        `,
    );
}

describe('extractCoderPingAnswer', () => {
    it('extracts the answer from plain harness output', () => {
        const runtimeLog = buildRuntimeLogSection(
            spaceTrim(`
                ${CODER_PING_ANSWER_MARKER}: 42
                tokens used: 1234
            `),
        );

        expect(extractCoderPingAnswer(runtimeLog)).toBe('42');
    });

    it('ignores the answer marker contained in the prompt of the raw input', () => {
        const runtimeLog = buildRuntimeLogSection('tokens used: 1234');

        expect(extractCoderPingAnswer(runtimeLog)).toBeNull();
    });

    it('extracts the answer embedded in a JSON event stream without its surrounding JSON', () => {
        const runtimeLog = buildRuntimeLogSection(
            `{"type":"result","subtype":"success","result":"${CODER_PING_ANSWER_MARKER}: 42"}`,
        );

        expect(extractCoderPingAnswer(runtimeLog)).toBe('42');
    });

    it('takes the last answer when the harness streams partial messages', () => {
        const runtimeLog = buildRuntimeLogSection(
            spaceTrim(`
                {"type":"stream_event","delta":"${CODER_PING_ANSWER_MARKER}: 4"}
                {"type":"result","result":"${CODER_PING_ANSWER_MARKER}: 42"}
            `),
        );

        expect(extractCoderPingAnswer(runtimeLog)).toBe('42');
    });

    it('reads only the last execution when the runner retried after a rate limit', () => {
        const runtimeLog = [
            buildRuntimeLogSection('rate limit reached'),
            buildRuntimeLogSection(`${CODER_PING_ANSWER_MARKER}: 42`),
        ].join('\n');

        expect(extractCoderPingAnswer(runtimeLog)).toBe('42');
    });

    it('returns null for an empty runtime log', () => {
        expect(extractCoderPingAnswer('')).toBeNull();
    });
});
