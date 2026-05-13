import { buildAgentRunUiFrame } from './buildAgentRunUiFrame';

/**
 * Removes ANSI escape sequences from a rendered UI line for text assertions.
 */
function stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Builds one stable frame input so individual tests only override the parts they care about.
 */
function createFrameOptions(overrides: Partial<Parameters<typeof buildAgentRunUiFrame>[0]> = {}) {
    return {
        terminalWidth: 96,
        animationFrame: 0,
        spinner: '⠋',
        pauseState: 'RUNNING' as const,
        config: {
            agentName: 'github-copilot',
            localAgentName: 'GitHub Copilot Support',
            modelName: 'gpt-5.4',
            thinkingLevel: 'high',
            priority: 0,
        },
        phase: 'running' as const,
        currentPromptLabel: 'messages/queued/message-0008.md',
        currentAttempt: 1,
        maxAttempts: 3,
        statusMessage: 'Running',
        detailLines: [],
        messagePreviewLines: [
            'Please summarize the latest PR feedback.',
            'Keep the answer concise and mention blockers.',
        ],
        pendingEnterLabel: undefined,
        agentOutputLines: ['assistant: Reviewing the queued message'],
        errors: [],
        progress: {
            totalPrompts: 5,
            sessionDone: 3,
            sessionTotal: 5,
            sessionRemaining: 2,
            currentPromptIndex: 4,
            skippedPrompts: 0,
            toBeWrittenPrompts: 0,
            percentage: 60,
            elapsedText: '3m',
            estimatedTotalText: '5m',
            estimatedLabel: 'Today 10:25',
            isEstimatedTotalKnown: true,
        },
        ...overrides,
    };
}

describe('buildAgentRunUiFrame', () => {
    it('renders agent-specific session metadata and the user-message preview box', () => {
        const output = buildAgentRunUiFrame(createFrameOptions()).map(stripAnsi).join('\n');

        expect(output).toContain('Agent    GitHub Copilot Support');
        expect(output).toContain('Runner   github-copilot  ·  gpt-5.4  ·  thinking high');
        expect(output).toContain('Queue    5 total  ·  3 finished  ·  2 queued');
        expect(output).toContain('Timing   Elapsed 3m  ·  Total 5m  ·  ETA Today 10:25');
        expect(output).toContain('60% complete (3/5 finished)');
        expect(output).toContain('User message');
        expect(output).toContain('Please summarize the latest PR feedback.');
        expect(output).toContain('Keep the answer concise and mention blockers.');
        expect(output).not.toContain('ptbk.io');
    });

    it('keeps both the message preview and live output sections at a stable height', () => {
        const shorterFrame = buildAgentRunUiFrame(createFrameOptions({ messagePreviewLines: ['Short prompt'], agentOutputLines: [] }));
        const longerFrame = buildAgentRunUiFrame(
            createFrameOptions({
                messagePreviewLines: [
                    'Line 1',
                    'Line 2',
                    'Line 3',
                    'Line 4',
                    'Line 5',
                    'Line 6',
                    'Line 7',
                ],
                agentOutputLines: ['A', 'B', 'C', 'D', 'E'],
            }),
        );

        expect(longerFrame).toHaveLength(shorterFrame.length);
    });
});
