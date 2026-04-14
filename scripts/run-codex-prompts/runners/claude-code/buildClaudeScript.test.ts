import { buildClaudeScript } from './buildClaudeScript';

describe('buildClaudeScript', () => {
    it('uses single-result JSON output by default', () => {
        const script = buildClaudeScript({
            prompt: 'Review the code',
        });

        expect(script).toContain('--output-format json');
        expect(script).not.toContain('--output-format stream-json');
    });

    it('enables partial realtime stream-json output for the terminal UI', () => {
        const script = buildClaudeScript({
            prompt: 'Review the code',
            streamOutput: true,
        });

        expect(script).toContain('--output-format stream-json');
        expect(script).toContain('--include-partial-messages');
    });
});
