import {
    buildClaudeCodeSessionResurrectionPrompt,
    CLAUDE_CODE_SESSION_LIMIT_RESET_BUFFER_MS,
    extractClaudeCodeSessionLimitFromOutput,
    getClaudeCodeSessionLimitDelayMs,
} from './ClaudeCodeSessionResurrection';

/**
 * Session id used by Claude Code resurrection tests.
 */
const CLAUDE_CODE_SESSION_ID = '61e19706-0dd7-4835-89b8-3ae12c0b57cc';

describe('ClaudeCodeSessionResurrection', () => {
    it('extracts rejected session limit details from Claude Code stream-json output', () => {
        const output = [
            `Error: {"type":"system","subtype":"init","session_id":"${CLAUDE_CODE_SESSION_ID}"}`,
            `{"type":"rate_limit_event","rate_limit_info":{"status":"rejected","resetsAt":1783078800,"rateLimitType":"five_hour"},"session_id":"${CLAUDE_CODE_SESSION_ID}"}`,
            `{"type":"result","subtype":"success","is_error":true,"api_error_status":429,"result":"You've hit your session limit · resets 1:40pm (Europe/Prague)","session_id":"${CLAUDE_CODE_SESSION_ID}"}`,
        ].join('\n');

        const sessionLimit = extractClaudeCodeSessionLimitFromOutput(output);

        expect(sessionLimit).toEqual({
            sessionId: CLAUDE_CODE_SESSION_ID,
            resetDate: new Date(1783078800 * 1000),
            rateLimitType: 'five_hour',
            summary: "You've hit your session limit · resets 1:40pm (Europe/Prague)",
        });
    });

    it('ignores non-session-limit Claude Code output', () => {
        const output = `{"type":"result","subtype":"success","is_error":false,"session_id":"${CLAUDE_CODE_SESSION_ID}"}`;

        expect(extractClaudeCodeSessionLimitFromOutput(output)).toBeUndefined();
    });

    it('does not resurrect a bare rate limit event without session-limit text', () => {
        const output = [
            `{"type":"system","subtype":"init","session_id":"${CLAUDE_CODE_SESSION_ID}"}`,
            `{"type":"rate_limit_event","rate_limit_info":{"status":"rejected","resetsAt":1783078800,"rateLimitType":"unknown"},"session_id":"${CLAUDE_CODE_SESSION_ID}"}`,
        ].join('\n');

        expect(extractClaudeCodeSessionLimitFromOutput(output)).toBeUndefined();
    });

    it('waits until the reported reset plus safety buffer', () => {
        const sessionLimit = {
            sessionId: CLAUDE_CODE_SESSION_ID,
            resetDate: new Date('2026-07-03T11:40:00.000Z'),
            summary: 'Session limit',
        };
        const nowMs = new Date('2026-07-03T11:39:50.000Z').getTime();

        expect(getClaudeCodeSessionLimitDelayMs(sessionLimit, nowMs)).toBe(
            10_000 + CLAUDE_CODE_SESSION_LIMIT_RESET_BUFFER_MS,
        );
    });

    it('builds a resume prompt that preserves the original task as reference', () => {
        const prompt = buildClaudeCodeSessionResurrectionPrompt('Implement the feature', CLAUDE_CODE_SESSION_ID);

        expect(prompt).toContain('Claude Code session resurrection');
        expect(prompt).toContain(CLAUDE_CODE_SESSION_ID);
        expect(prompt).toContain('Implement the feature');
    });
});
