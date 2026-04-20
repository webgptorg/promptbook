import { buildCoderRunUiFrame, type BuildCoderRunUiFrameOptions } from './buildCoderRunUiFrame';

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
function createFrameOptions(
    overrides: Partial<BuildCoderRunUiFrameOptions> = {},
): BuildCoderRunUiFrameOptions {
    return {
        terminalWidth: 96,
        animationFrame: 0,
        spinner: '⠋',
        pauseState: 'RUNNING',
        config: {
            agentName: 'GitHub Copilot',
            modelName: 'gpt-5.4',
            thinkingLevel: 'xhigh',
            context: 'AGENTS.md',
            priority: 1,
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
            totalPrompts: 18,
            sessionDone: 2,
            sessionTotal: 5,
            sessionRemaining: 3,
            currentPromptIndex: 3,
            skippedPrompts: 12,
            toBeWrittenPrompts: 1,
            percentage: 25,
            elapsedText: '2m',
            estimatedTotalText: '8m',
            estimatedLabel: 'Today 9:45',
            isEstimatedTotalKnown: true,
        },
        ...overrides,
    };
}

describe('buildCoderRunUiFrame', () => {
    it('renders standalone branding and a structured session box with enter and pause controls', () => {
        const lines = buildCoderRunUiFrame(createFrameOptions()).map(stripAnsi);
        const output = lines.join('\n');

        expect(output).toContain('▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄▄');
        expect(output).not.toContain('ptbk coder');
        expect(output).not.toContain('run >_');
        expect(output).not.toContain('shipping fix');
        expect(output).not.toContain('┌ Brand');
        expect(output).toContain('GitHub Copilot  ·  gpt-5.4  ·  thinking xhigh');
        expect(output).toContain('Context  AGENTS.md');
        expect(output).toContain('Test     npm test');
        expect(output).toContain('This run Task 3/5  ·  2 done  ·  3 left');
        expect(output).toContain('Backlog  Repo 18 total  ·  12 prompts below priority');
        expect(output).toContain('Scope    Priority ≥1  ·  Write 1 prompt first');
        expect(output).toContain('Timing   Elapsed 2m  ·  Total 8m  ·  ETA Today 9:45');
        expect(output).toContain('25% complete (2/5 done)');
        expect(output).toContain('Current task');
        expect(output).toContain('ENTER  Start');
        expect(output).toContain('P  Pause');
    });

    it('keeps the frame height stable while live output grows', () => {
        const emptyOutputFrame = buildCoderRunUiFrame(createFrameOptions({ agentOutputLines: [] }));
        const streamingOutputFrame = buildCoderRunUiFrame(
            createFrameOptions({
                agentOutputLines: ['First chunk', 'Second chunk', 'Third chunk', 'Fourth chunk', 'Fifth chunk'],
            }),
        );

        expect(streamingOutputFrame).toHaveLength(emptyOutputFrame.length);
    });

    it('animates the octopus only during active phases', () => {
        const waitingFrameA = buildCoderRunUiFrame(createFrameOptions({ phase: 'waiting', animationFrame: 0, spinner: '⠋' }))
            .slice(0, 6)
            .map(stripAnsi)
            .join('\n');
        const waitingFrameB = buildCoderRunUiFrame(createFrameOptions({ phase: 'waiting', animationFrame: 1, spinner: '⠙' }))
            .slice(0, 6)
            .map(stripAnsi)
            .join('\n');
        const runningFrameA = buildCoderRunUiFrame(createFrameOptions({ phase: 'running', animationFrame: 0, spinner: '⠋' }))
            .map(stripAnsi)
            .join('\n');
        const runningFrameB = buildCoderRunUiFrame(createFrameOptions({ phase: 'running', animationFrame: 1, spinner: '⠙' }))
            .map(stripAnsi)
            .join('\n');

        expect(waitingFrameB).toBe(waitingFrameA);
        expect(runningFrameB).not.toBe(runningFrameA);
    });

    it('renders distinct pausing and paused controls', () => {
        const pausingOutput = buildCoderRunUiFrame(createFrameOptions({ phase: 'running', pauseState: 'PAUSING' }))
            .map(stripAnsi)
            .join('\n');
        const pausedOutput = buildCoderRunUiFrame(createFrameOptions({ phase: 'paused', pauseState: 'PAUSED' }))
            .map(stripAnsi)
            .join('\n');

        expect(pausingOutput).toContain('PAUSING');
        expect(pausingOutput).toContain('Pausing before the next task');
        expect(pausingOutput).toContain('P  Cancel pause');

        expect(pausedOutput).toContain('PAUSED');
        expect(pausedOutput).toContain('Paused until resumed');
        expect(pausedOutput).toContain('P  Resume');
    });
});
