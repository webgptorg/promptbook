import { buildClaudeScript } from './buildClaudeScript';

describe('buildClaudeScript', () => {
    it('uses stdin instead of a huge shell argument', () => {
        const script = buildClaudeScript({
            prompt: 'Hello from test prompt',
        });

        expect(script).toContain("<<'CLAUDE_PROMPT'");
        expect(script).toContain('claude --allowedTools "Bash,Read,Edit,Write"');
        expect(script).not.toContain('claude -p');
        expect(script).toContain('--output-format json');
        expect(script).toContain('--print');
        expect(script).toContain('Hello from test prompt');
    });

    it('uses the provided thinking level in the Claude Code CLI command', () => {
        const script = buildClaudeScript({
            prompt: 'Hello from test prompt',
            thinkingLevel: 'xhigh',
        });

        expect(script).toContain('--effort xhigh');
    });

    it('passes the max thinking level as Claude Code effort', () => {
        const script = buildClaudeScript({
            prompt: 'Hello from test prompt',
            thinkingLevel: 'max',
        });

        expect(script).toContain('--effort max');
    });

    it('omits the effort flag when no thinking level is provided', () => {
        const script = buildClaudeScript({
            prompt: 'Prompt',
        });

        expect(script).not.toContain('--effort');
    });
});
