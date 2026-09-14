import { formatRunnerSignature } from './formatRunnerSignature';

describe('formatRunnerSignature', () => {
    it('names the harness, its model and its thinking level', () => {
        expect(
            formatRunnerSignature({
                runnerName: 'OpenAI Codex',
                modelName: 'gpt-5.6-luna',
                thinkingLevel: 'max',
            }),
        ).toBe('OpenAI Codex `gpt-5.6-luna` thinking `max`');
    });

    it('names the Book agent in front of the harness which runs it', () => {
        expect(
            formatRunnerSignature({
                agentName: 'Developer',
                runnerName: 'OpenAI Codex',
                modelName: 'gpt-5.6-luna',
                thinkingLevel: 'max',
            }),
        ).toBe('Developer on OpenAI Codex `gpt-5.6-luna` thinking `max`');
    });

    it('names the Book agent even when the harness runs without an explicit model', () => {
        expect(
            formatRunnerSignature({
                agentName: 'Developer',
                runnerName: 'Claude Code',
            }),
        ).toBe('Developer on Claude Code');
    });

    it('leaves the harness alone when no Book agent is selected', () => {
        expect(formatRunnerSignature({ runnerName: 'Claude Code', modelName: 'claude-opus-5' })).toBe(
            'Claude Code `claude-opus-5`',
        );
    });

    it('ignores a blank Book agent name', () => {
        expect(formatRunnerSignature({ agentName: '   ', runnerName: 'Claude Code' })).toBe('Claude Code');
    });

    it('reports an unknown runner as unknown', () => {
        expect(formatRunnerSignature({})).toBe('unknown');
        expect(formatRunnerSignature({ agentName: 'Developer' })).toBe('Developer on unknown');
    });
});
