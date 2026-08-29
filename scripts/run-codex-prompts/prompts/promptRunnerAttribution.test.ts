import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import type { CoderRunStep } from '../common/CoderRunStep';
import { markPromptDone } from './markPromptDone';
import { markPromptFailed } from './markPromptFailed';
import { markPromptInProgress } from './markPromptInProgress';
import { parsePromptFile } from './parsePromptFile';
import { formatPromptRunnerAttribution, parsePromptStartedByRunnerSignature } from './promptRunnerAttribution';

/**
 * Builds a minimal single-implementation step list for the attribution tests.
 */
function createDoneSteps(): ReadonlyArray<CoderRunStep> {
    return [{ kind: 'implementation', usage: UNCERTAIN_USAGE, durationMs: 10 * 60 * 1000 }];
}

/**
 * Parses one single-prompt file used by these tests.
 */
function createPromptFile(statusLine: string) {
    const file = parsePromptFile(
        'prompts/continued-prompt.md',
        spaceTrim(`
            ${statusLine}
            Implement the feature
        `),
    );

    return { file, section: file.sections[0]! };
}

describe('formatPromptRunnerAttribution', () => {
    it('names only the current harness when no other harness worked on the prompt', () => {
        expect(
            formatPromptRunnerAttribution({
                currentRunnerSignature: 'Claude Code `claude-opus-5`',
            }),
        ).toBe('by Claude Code `claude-opus-5`');
    });

    it('names both harnesses when the work was taken over', () => {
        expect(
            formatPromptRunnerAttribution({
                currentRunnerSignature: 'Claude Code `claude-opus-5` thinking `high`',
                startedByRunnerSignature: 'OpenAI Codex `gpt-5.6-luna` thinking `max`',
            }),
        ).toBe('by Claude Code `claude-opus-5` thinking `high`, started by OpenAI Codex `gpt-5.6-luna` thinking `max`');
    });

    it('names one harness only once when it continues its own work', () => {
        expect(
            formatPromptRunnerAttribution({
                currentRunnerSignature: 'Claude Code `claude-opus-5`',
                startedByRunnerSignature: 'Claude Code `claude-opus-5`',
            }),
        ).toBe('by Claude Code `claude-opus-5`');
    });
});

describe('parsePromptStartedByRunnerSignature', () => {
    it('reads the only harness of a status line written by a single harness', () => {
        expect(
            parsePromptStartedByRunnerSignature(
                '[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation in progress',
            ),
        ).toBe('OpenAI Codex `gpt-5.6-luna` thinking `max`');
    });

    it('keeps naming the original harness of a prompt which was already taken over', () => {
        expect(
            parsePromptStartedByRunnerSignature(
                '[^] by Claude Code `claude-opus-5`, started by OpenAI Codex `gpt-5.6-luna` - Testing in progress',
            ),
        ).toBe('OpenAI Codex `gpt-5.6-luna`');
    });

    it('reads a status line which carries attempt metadata and a login method', () => {
        expect(
            parsePromptStartedByRunnerSignature(
                '[^] (2 attempts) by OpenAI Codex `gpt-5.6-luna` (ChatGPT account) - Implementation in progress',
            ),
        ).toBe('OpenAI Codex `gpt-5.6-luna` (ChatGPT account)');
    });

    it('reports no harness for a status line without an attribution', () => {
        expect(parsePromptStartedByRunnerSignature('[ ] !!')).toBeUndefined();
    });
});

describe('status lines of a continued prompt', () => {
    it('names both harnesses in the in-progress status line', () => {
        const { file, section } = createPromptFile(
            '[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation in progress',
        );

        markPromptInProgress({
            file,
            section,
            steps: [],
            inProgressStepKind: 'implementation',
            runnerName: 'Claude Code',
            modelName: 'claude-opus-5',
            startedByRunnerSignature: 'OpenAI Codex `gpt-5.6-luna` thinking `max`',
            attemptCount: 1,
            thinkingLevel: 'high',
        });

        expect(file.lines[0]).toBe(
            '[^] by Claude Code `claude-opus-5` thinking `high`, started by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation in progress',
        );
    });

    it('names both harnesses in the done status line', () => {
        const { file, section } = createPromptFile('[^] by OpenAI Codex `gpt-5.6-luna` - Implementation in progress');

        markPromptDone({
            file,
            section,
            steps: createDoneSteps(),
            runnerName: 'Claude Code',
            modelName: 'claude-opus-5',
            startedByRunnerSignature: 'OpenAI Codex `gpt-5.6-luna`',
            attemptCount: 1,
        });

        expect(file.lines[0]).toMatch(/^\[x\] /u);
        expect(file.lines[0]).toContain(
            'by Claude Code `claude-opus-5`, started by OpenAI Codex `gpt-5.6-luna` - Implementation ',
        );
    });

    it('names both harnesses in the failed status line', () => {
        const { file, section } = createPromptFile('[^] by OpenAI Codex `gpt-5.6-luna` - Implementation in progress');

        markPromptFailed({
            file,
            section,
            runnerName: 'Claude Code',
            modelName: 'claude-opus-5',
            startedByRunnerSignature: 'OpenAI Codex `gpt-5.6-luna`',
            promptExecutionStartedDate: moment().subtract(2, 'minutes'),
            attemptCount: 1,
        });

        expect(file.lines[0]).toContain('by Claude Code `claude-opus-5`, started by OpenAI Codex `gpt-5.6-luna`');
        expect(file.lines[0]).toMatch(/^\[!\] failed after /u);
    });
});
