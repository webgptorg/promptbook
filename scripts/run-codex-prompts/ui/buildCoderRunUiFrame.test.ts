import { buildCoderRunUiFrame, type BuildCoderRunUiFrameOptions } from './buildCoderRunUiFrame';
import { stripAnsi } from './coderRunUiText';

/**
 * Builds one stable frame input so individual tests only override the parts they care about.
 */
function createFrameOptions(
    overrides: Partial<BuildCoderRunUiFrameOptions> = {},
): BuildCoderRunUiFrameOptions {
    return {
        terminalWidth: 96,
        animationFrame: 0,
        animationTimeMs: 0,
        spinner: '⠋',
        pauseState: 'RUNNING',
        pauseTargetLabel: 'the next task',
        config: {
            agentName: 'GitHub Copilot',
            modelName: 'gpt-5.4',
            thinkingLevel: 'xhigh',
            context: 'AGENTS.md',
            serverUrl: 'http://localhost:4441',
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
        expect(output).toContain('Server   http://localhost:4441');
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

    it('shows the ASCII-art agent visual instead of the default brand banner when one is provided', () => {
        const agentVisualLines = [
            '\u001b[38;2;34;211;238m▄▀▄▀▄▀▄▀\u001b[0m',
            '\u001b[38;2;34;211;238m▀▄▀▄▀▄▀▄\u001b[0m',
        ];
        const lines = buildCoderRunUiFrame(createFrameOptions({ agentVisualLines })).map(stripAnsi);
        const output = lines.join('\n');

        expect(output).not.toContain('▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄▄');
        expect(output).toContain('▄▀▄▀▄▀▄▀');
        expect(output).toContain('▀▄▀▄▀▄▀▄');
        expect(lines[0]!.startsWith(' ')).toBe(true); // <- Note: The agent visual is centered on the frame width
    });

    it('renders the animated agent visual frame for the current animation time', () => {
        const lines = buildCoderRunUiFrame(
            createFrameOptions({
                animationTimeMs: 1234,
                agentVisual: {
                    isAnimated: true,
                    renderFrame: ({ animationTimeMs }) => [`agent frame ${animationTimeMs}`],
                },
            }),
        ).map(stripAnsi);
        const output = lines.join('\n');

        expect(output).not.toContain('▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄▄');
        expect(output).toContain('agent frame 1234');
    });

    it('falls back to the default banner when the agent visual cannot render a frame', () => {
        const output = buildCoderRunUiFrame(
            createFrameOptions({
                agentVisual: {
                    isAnimated: true,
                    renderFrame: () => [],
                },
            }),
        )
            .map(stripAnsi)
            .join('\n');

        expect(output).toContain('▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄▄');
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
        expect(pausedOutput).toContain('Paused before the next task');
        expect(pausedOutput).toContain('P  Resume');
    });

    it('renders the upcoming pause target when pausing inside one prompt stage', () => {
        const output = buildCoderRunUiFrame(
            createFrameOptions({
                phase: 'verifying',
                pauseState: 'PAUSING',
                pauseTargetLabel: 'running verification after attempt #2',
            }),
        )
            .map(stripAnsi)
            .join('\n');

        expect(output).toContain('Pausing before running verification after attempt #2');
    });

    it('renders the active temporary shell script as a clickable Session link', () => {
        const scriptPath = `${process.cwd()}\\.promptbook\\coder-prompts\\feature.sh`;
        const lines = buildCoderRunUiFrame(createFrameOptions({ currentScriptPaths: [scriptPath] }));
        const output = lines.map(stripAnsi).join('\n');

        expect(output).toContain('Script   .promptbook/coder-prompts/feature.sh');
        expect(lines.join('\n')).toContain('file:///');
    });
});
