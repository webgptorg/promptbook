import { buildCoderRunUiFrame } from './buildCoderRunUiFrame';

/**
 * Removes ANSI escape sequences from a rendered UI line for text assertions.
 */
function stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

describe('buildCoderRunUiFrame', () => {
    it('renders the branded boxed layout with enter and pause controls', () => {
        const lines = buildCoderRunUiFrame({
            terminalWidth: 80,
            spinner: '⠋',
            pauseState: 'RUNNING',
            config: {
                agentName: 'GitHub Copilot',
                modelName: 'gpt-5.4',
                thinkingLevel: 'xhigh',
                context: 'AGENTS.md',
                priority: 0,
                testCommand: 'npm test',
            },
            phase: 'waiting',
            currentPromptLabel: 'prompts/001-task.md > Refresh the coder UI',
            currentAttempt: 1,
            maxAttempts: 3,
            statusMessage: 'Ready to start the first task',
            detailLines: ['Improve the boxed layout and stop duplicated tail prompts.'],
            pendingEnterLabel: 'Start',
            agentOutputLines: ['assistant: Drafting an improved terminal frame'],
            errors: [],
            progress: {
                totalPrompts: 12,
                sessionDone: 2,
                sessionTotal: 5,
                percentage: 25,
                elapsedText: '2m',
                estimatedTotalText: '8m',
                estimatedLabel: 'Today 9:45',
            },
        }).map(stripAnsi);

        expect(lines.join('\n')).toContain('Promptbook Coder');
        expect(lines.join('\n')).toContain('GitHub Copilot  ·  gpt-5.4  ·  thinking xhigh');
        expect(lines.join('\n')).toContain('Context AGENTS.md  ·  Priority ≥0  ·  Test npm test');
        expect(lines.join('\n')).toContain('Current task');
        expect(lines.join('\n')).toContain('ENTER  Start');
        expect(lines.join('\n')).toContain('P  Pause');
    });
});
