import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import type { Usage } from '../../../src/execution/Usage';
import { ZERO_USAGE } from '../../../src/execution/utils/usage-constants';
import type { CoderRunStep } from '../common/CoderRunStep';
import { markPromptDone } from './markPromptDone';
import { markPromptFailed } from './markPromptFailed';
import { markPromptInProgress } from './markPromptInProgress';
import { parsePromptFile } from './parsePromptFile';

/**
 * Number of milliseconds in one minute, used to build readable step durations in these tests.
 */
const ONE_MINUTE_MS = 60 * 1000;

/**
 * Builds a usage record with a concrete, certain price for the in-progress status tests.
 */
function createUsageWithPrice(price: number): Usage {
    return { ...ZERO_USAGE, price: { value: price } };
}

/**
 * Builds the finished implementation step shared by the multi-step tests.
 */
function createImplementationStep(): CoderRunStep {
    return { kind: 'implementation', usage: createUsageWithPrice(0.2036), durationMs: 10 * ONE_MINUTE_MS };
}

/**
 * Parses one single-prompt file used by these tests.
 */
function createPromptFile(statusLine: string) {
    const file = parsePromptFile(
        'prompts/mark-prompt-in-progress.md',
        spaceTrim(`
            ${statusLine}
            Implement the feature
        `),
    );

    return { file, section: file.sections[0]! };
}

describe('markPromptInProgress', () => {
    it('turns a todo prompt into an in-progress prompt naming the started step', () => {
        const { file, section } = createPromptFile('[ ]');

        markPromptInProgress({
            file,
            section,
            steps: [],
            inProgressStepKind: 'implementation',
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-luna',
            attemptCount: 1,
            thinkingLevel: 'max',
        });

        expect(file.lines[0]).toBe('[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation in progress');
    });

    it('appends the started step behind the steps which already finished', () => {
        const { file, section } = createPromptFile('[ ]');

        markPromptInProgress({
            file,
            section,
            steps: [createImplementationStep()],
            inProgressStepKind: 'testing',
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-luna',
            attemptCount: 1,
            loginMethod: 'chatgpt',
            thinkingLevel: 'max',
        });

        expect(file.lines[0]).toBe(
            '[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation $0.2036 10 minutes; Testing in progress',
        );
    });

    it('overwrites an in-progress status line with the next in-progress status line', () => {
        const { file, section } = createPromptFile(
            '[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation in progress',
        );

        markPromptInProgress({
            file,
            section,
            steps: [createImplementationStep()],
            inProgressStepKind: 'testing',
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-luna',
            attemptCount: 1,
            thinkingLevel: 'max',
        });

        expect(file.lines[0]).toBe(
            '[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation $0.2036 10 minutes; Testing in progress',
        );
    });

    it('is replaced by the done status line when the prompt finishes', () => {
        const { file, section } = createPromptFile('[ ]');

        markPromptInProgress({
            file,
            section,
            steps: [createImplementationStep()],
            inProgressStepKind: 'testing',
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-luna',
            attemptCount: 1,
            thinkingLevel: 'max',
        });
        markPromptDone(
            file,
            section,
            [createImplementationStep(), { kind: 'testing', usage: null, durationMs: 35 * ONE_MINUTE_MS }],
            'OpenAI Codex',
            'gpt-5.6-luna',
            1,
            undefined,
            'max',
        );

        expect(file.lines[0]).toBe(
            '[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation $0.2036 10 minutes; Testing 35 minutes',
        );
    });

    it('is replaced by the failed status line when the round gives up', () => {
        const { file, section } = createPromptFile('[ ]');

        markPromptInProgress({
            file,
            section,
            steps: [],
            inProgressStepKind: 'implementation',
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-luna',
            attemptCount: 1,
        });
        markPromptFailed(file, section, 'OpenAI Codex', 'gpt-5.6-luna', moment().subtract(2, 'minutes'), 3);

        expect(file.lines[0]).toMatch(/^\[!\] \(failed after 3 attempts\) /u);
        expect(file.lines[0]).not.toContain('in progress');
    });

    it('removes a required model token and keeps the indentation of the todo status line', () => {
        const { file, section } = createPromptFile('    [ ] use model `gpt-5.5` !!!!!');

        markPromptInProgress({
            file,
            section,
            steps: [],
            inProgressStepKind: 'implementation',
            runnerName: 'GitHub Copilot',
            modelName: 'gpt-5.5',
            attemptCount: 1,
        });

        expect(file.lines[0]).toBe('    [^] by GitHub Copilot `gpt-5.5` - Implementation in progress');
    });

    it('records the attempt count of a repeated coding attempt', () => {
        const { file, section } = createPromptFile('[ ]');

        markPromptInProgress({
            file,
            section,
            steps: [createImplementationStep(), { kind: 'testing', usage: null, durationMs: 2 * ONE_MINUTE_MS }],
            inProgressStepKind: 'fixing',
            runnerName: 'GitHub Copilot',
            modelName: 'gpt-5.5',
            attemptCount: 2,
        });

        expect(file.lines[0]).toBe(
            '[^] (2 attempts) by GitHub Copilot `gpt-5.5` - Implementation $0.2036 10 minutes; Testing 2 minutes; Fixing in progress',
        );
    });
});

describe('parsing in-progress prompts', () => {
    it('parses a `[^]` status line as an in-progress prompt', () => {
        const { section } = createPromptFile('[^] by OpenAI Codex `gpt-5.6-luna` - Implementation in progress');

        expect(section.status).toBe('in-progress');
    });

    it('never offers an in-progress prompt as the next todo prompt', () => {
        const { file } = createPromptFile('[^] by OpenAI Codex `gpt-5.6-luna` - Implementation in progress');

        expect(file.sections.filter((section) => section.status === 'todo')).toHaveLength(0);
    });
});
