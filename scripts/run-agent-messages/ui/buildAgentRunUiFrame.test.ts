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
        currentPromptLabel: 'messages/queued/message-0008.book',
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
        expect(output).toContain('Status   0 idle  ·  1 answering');
        expect(output).toContain('Messages 3 answered total  ·  2 waiting');
        expect(output).toContain('GitHub Copilot Support');
        expect(output).toContain('Answering GitHub Copilot Support  ·  messages/queued/message-0008.book');
        expect(output).toContain('Agents');
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

    it('renders idle watching state inside the frame without a current prompt label', () => {
        const output = buildAgentRunUiFrame(
            createFrameOptions({
                phase: 'waiting',
                currentPromptLabel: '',
                statusMessage: 'Watching queued agent messages',
                detailLines: ['Watching messages/queued for queued agent messages.'],
                messagePreviewLines: ['Waiting for the next queued `MESSAGE @User`.'],
                progress: {
                    totalPrompts: 0,
                    sessionDone: 0,
                    sessionTotal: 0,
                    sessionRemaining: 0,
                    currentPromptIndex: 0,
                    skippedPrompts: 0,
                    toBeWrittenPrompts: 0,
                    percentage: 0,
                    elapsedText: '12s',
                    estimatedTotalText: '12s',
                    estimatedLabel: 'Today 10:25',
                    isEstimatedTotalKnown: true,
                },
            }),
        )
            .map(stripAnsi)
            .join('\n');

        expect(output).toContain('State     WAITING  Watching queued agent messages');
        expect(output).toContain('Status   1 idle  ·  0 answering');
        expect(output).toContain('Messages 0 answered total  ·  0 waiting');
        expect(output).toContain('Idle      GitHub Copilot Support');
        expect(output).toContain('Watching messages/queued for queued agent messages.');
        expect(output).toContain('Waiting for the next queued `MESSAGE @User`.');
        expect(output).not.toContain('Pulling latest changes while idle...');
    });

    it('renders all watched agents with their status and active message preview', () => {
        const output = buildAgentRunUiFrame(
            createFrameOptions({
                config: {
                    agentName: 'github-copilot',
                    localAgentName: '2 Agents',
                    modelName: 'gpt-5.4',
                    thinkingLevel: 'high',
                    priority: 0,
                },
                agentStatusLines: [
                    'Answering Agent A (agent-a)  ·  messages/queued/a.book: Please review the contract',
                    'Idle      Agent B (agent-b)',
                ],
                messagePreviewLines: ['Agent A: Please review the contract'],
            }),
        )
            .map(stripAnsi)
            .join('\n');

        expect(output).toContain('Agents   2 Agents');
        expect(output).toContain('Status   1 idle  ·  1 answering');
        expect(output).toContain('Answering Agent A (agent-a)');
        expect(output).toContain('Idle      Agent B (agent-b)');
        expect(output).toContain('Agent A: Please review the contract');
    });
});
