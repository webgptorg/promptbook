import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import { markPromptDone } from './markPromptDone';
import { markPromptFailed } from './markPromptFailed';
import { markPromptInProgress } from './markPromptInProgress';
import { parsePromptFile } from './parsePromptFile';
import { formatPromptRunnerAttribution, parsePromptRunnerAttribution } from './promptRunnerAttribution';

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

    it('names the interrupted harness before the harness which continues the work', () => {
        expect(
            formatPromptRunnerAttribution({
                previousRunnerSignatures: ['Claude Code `claude-opus-5` thinking `max`'],
                currentRunnerSignature: 'OpenAI Codex `gpt-5.6-terra` thinking `max`',
            }),
        ).toBe(
            'by Claude Code `claude-opus-5` thinking `max`, interrupted, continued by OpenAI Codex `gpt-5.6-terra` thinking `max`',
        );
    });

    it('keeps every preceding continuation in the chronological report', () => {
        expect(
            formatPromptRunnerAttribution({
                previousRunnerSignatures: [
                    'Claude Code `claude-opus-5` thinking `max`',
                    'OpenAI Codex `gpt-5.6-terra` thinking `max`',
                ],
                currentRunnerSignature: 'GitHub Copilot `gpt-5.5` thinking `high`',
            }),
        ).toBe(
            'by Claude Code `claude-opus-5` thinking `max`, interrupted, continued by OpenAI Codex `gpt-5.6-terra` thinking `max`, interrupted, continued by GitHub Copilot `gpt-5.5` thinking `high`',
        );
    });

    it('keeps the authentication label when the same harness resumes its own work', () => {
        expect(
            formatPromptRunnerAttribution({
                previousRunnerSignatures: ['OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account)'],
                currentRunnerSignature: 'OpenAI Codex `gpt-5.6-terra` thinking `max`',
            }),
        ).toBe('by OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account)');
    });
});

describe('parsePromptRunnerAttribution', () => {
    it('reads the only harness of a status line written by a single harness', () => {
        expect(
            parsePromptRunnerAttribution(
                '[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation in progress',
            ),
        ).toEqual(['OpenAI Codex `gpt-5.6-luna` thinking `max`']);
    });

    it('reads every harness in chronological order from a progressive continuation report', () => {
        expect(
            parsePromptRunnerAttribution(
                '[^] by Claude Code `claude-opus-5`, interrupted, continued by OpenAI Codex `gpt-5.6-luna` - Testing in progress',
            ),
        ).toEqual(['Claude Code `claude-opus-5`', 'OpenAI Codex `gpt-5.6-luna`']);
    });

    it('normalizes the reverse-ordered report written by earlier versions', () => {
        expect(
            parsePromptRunnerAttribution(
                '[^] by OpenAI Codex `gpt-5.6-luna`, started by Claude Code `claude-opus-5` - Testing in progress',
            ),
        ).toEqual(['Claude Code `claude-opus-5`', 'OpenAI Codex `gpt-5.6-luna`']);
    });

    it('reads a status line which carries attempt metadata and a login method', () => {
        expect(
            parsePromptRunnerAttribution(
                '[^] (2 attempts) by OpenAI Codex `gpt-5.6-luna` (ChatGPT account) - Implementation in progress',
            ),
        ).toEqual(['OpenAI Codex `gpt-5.6-luna` (ChatGPT account)']);
    });

    it('reports no harness for a status line without an attribution', () => {
        expect(parsePromptRunnerAttribution('[ ] !!')).toBeUndefined();
    });
});

describe('status lines of a continued prompt', () => {
    it('builds an in-progress report in chronological order', () => {
        const { file, section } = createPromptFile(
            '[^] by Claude Code `claude-opus-5` thinking `max` - Implementation in progress',
        );

        markPromptInProgress({
            file,
            section,
            steps: [],
            inProgressStepKind: 'implementation',
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-terra',
            previousRunnerSignatures: ['Claude Code `claude-opus-5` thinking `max`'],
            attemptCount: 1,
            thinkingLevel: 'max',
        });

        expect(file.lines[0]).toBe(
            '[^] by Claude Code `claude-opus-5` thinking `max`, interrupted, continued by OpenAI Codex `gpt-5.6-terra` thinking `max` - Implementation in progress',
        );
    });

    it('keeps both authentication labels in the done report', () => {
        const { file, section } = createPromptFile(
            '[^] by Claude Code `claude-opus-5` thinking `max` (ChatGPT account) - Implementation in progress',
        );

        markPromptDone({
            file,
            section,
            steps: [{ kind: 'implementation', usage: null, durationMs: 9 * 60 * 1000 }],
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-terra',
            previousRunnerSignatures: ['Claude Code `claude-opus-5` thinking `max` (ChatGPT account)'],
            attemptCount: 1,
            loginMethod: 'chatgpt',
            thinkingLevel: 'max',
        });

        expect(file.lines[0]).toBe(
            '[x] by Claude Code `claude-opus-5` thinking `max` (ChatGPT account), interrupted, continued by OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account)',
        );
    });

    it('shows the current phase without treating completed continuation steps as the whole prompt report', () => {
        const { file, section } = createPromptFile(
            '[^] by Claude Code `claude-opus-5` thinking `max` - Implementation in progress',
        );

        markPromptInProgress({
            file,
            section,
            steps: [{ kind: 'implementation', usage: null, durationMs: 9 * 60 * 1000 }],
            inProgressStepKind: 'testing',
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-terra',
            previousRunnerSignatures: ['Claude Code `claude-opus-5` thinking `max`'],
            attemptCount: 1,
            thinkingLevel: 'max',
        });

        expect(file.lines[0]).toBe(
            '[^] by Claude Code `claude-opus-5` thinking `max`, interrupted, continued by OpenAI Codex `gpt-5.6-terra` thinking `max` - Testing in progress',
        );
    });

    it('keeps the chronological report when the continuation fails', () => {
        const { file, section } = createPromptFile('[^] by Claude Code `claude-opus-5` - Implementation in progress');

        markPromptFailed({
            file,
            section,
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-terra',
            previousRunnerSignatures: ['Claude Code `claude-opus-5`'],
            promptExecutionStartedDate: moment().subtract(2, 'minutes'),
            attemptCount: 1,
        });

        expect(file.lines[0]).toContain(
            'by Claude Code `claude-opus-5`, interrupted, continued by OpenAI Codex `gpt-5.6-terra`',
        );
        expect(file.lines[0]).toMatch(/^\[!\] failed after /u);
    });
});
