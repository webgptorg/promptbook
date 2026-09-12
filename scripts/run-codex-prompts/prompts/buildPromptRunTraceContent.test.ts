import moment from 'moment';
import { buildPromptRunTraceContent } from './buildPromptRunTraceContent';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Builds one prompt section fixture.
 */
function createPromptSection(index: number): PromptSection {
    return {
        index,
        startLine: 0,
        endLine: 2,
        status: 'todo',
        priority: 0,
    };
}

/**
 * Builds a prompt file fixture with a single section.
 */
function createPromptFile(): PromptFile {
    return {
        path: '/project/prompts/feature.md',
        name: 'feature.md',
        lines: ['[ ]', '', 'Implement the feature'],
        eol: '\n',
        hasFinalEol: true,
        sections: [createPromptSection(0)],
    };
}

/**
 * Builds the shared trace input of a round which started and finished at known moments.
 */
function createTraceOptions() {
    const file = createPromptFile();

    return {
        file,
        section: file.sections[0]!,
        runnerName: 'OpenAI Codex',
        modelName: 'gpt-5.6-astra',
        thinkingLevel: 'max',
        attemptCount: 1,
        startedDate: moment('2026-09-12T10:00:00.000Z'),
        finishedDate: moment('2026-09-12T10:42:00.000Z'),
    } as const;
}

describe('buildPromptRunTraceContent', () => {
    it('reports the runner, the outcome and the timing of a successful round', () => {
        const content = buildPromptRunTraceContent({
            ...createTraceOptions(),
            testCommand: 'npm test',
            outcome: {
                kind: 'succeeded',
                steps: [{ kind: 'implementation', usage: null, durationMs: 42 * 60 * 1000 }],
                loginMethod: 'chatgpt',
            },
            runtimeLog: 'Codex says hello',
        });

        expect(content).toContain('# Run trace of ');
        expect(content).toContain('-   **Prompt:** Implement the feature');
        expect(content).toContain('-   **Outcome:** Succeeded');
        expect(content).toContain('-   **Runner:** OpenAI Codex `gpt-5.6-astra` thinking `max` (ChatGPT account)');
        expect(content).toContain('-   **Attempts:** 1');
        expect(content).toContain('-   **Verification command:** `npm test`');
        expect(content).toContain('-   **Started:** 2026-09-12T10:00:00.000Z');
        expect(content).toContain('-   **Finished:** 2026-09-12T10:42:00.000Z');
        expect(content).toContain('## Runtime log');
        expect(content).toContain('Codex says hello');
    });

    it('reports the error of a failed round in its own section', () => {
        const content = buildPromptRunTraceContent({
            ...createTraceOptions(),
            attemptCount: 3,
            outcome: { kind: 'failed', error: new Error('Verification never passed') },
            runtimeLog: 'npm test output',
        });

        expect(content).toContain('-   **Outcome:** Failed');
        expect(content).toContain('-   **Attempts:** 3');
        expect(content).toContain('## Failure');
        expect(content).toContain('Verification never passed');
    });

    it('omits the verification command of a round which ran without one', () => {
        const content = buildPromptRunTraceContent({
            ...createTraceOptions(),
            outcome: { kind: 'succeeded', steps: [] },
            runtimeLog: 'Codex says hello',
        });

        expect(content).not.toContain('**Verification command:**');
        expect(content).not.toContain('**Steps:**');
    });

    it('fences a runtime log which itself contains a markdown code fence', () => {
        const content = buildPromptRunTraceContent({
            ...createTraceOptions(),
            outcome: { kind: 'succeeded', steps: [] },
            runtimeLog: '```\nconst isEnabled = true;\n```',
        });

        expect(content).toContain('````text\n```\nconst isEnabled = true;\n```\n````');
    });

    it('names the traced section only for a prompt file holding more than one of them', () => {
        const singleSectionOptions = createTraceOptions();
        const multiSectionFile: PromptFile = {
            ...singleSectionOptions.file,
            sections: [createPromptSection(0), createPromptSection(1)],
        };

        expect(
            buildPromptRunTraceContent({
                ...singleSectionOptions,
                outcome: { kind: 'succeeded', steps: [] },
                runtimeLog: 'Codex says hello',
            }),
        ).not.toContain('**Prompt section:**');

        expect(
            buildPromptRunTraceContent({
                ...singleSectionOptions,
                file: multiSectionFile,
                section: multiSectionFile.sections[1]!,
                outcome: { kind: 'succeeded', steps: [] },
                runtimeLog: 'Codex says hello',
            }),
        ).toContain('-   **Prompt section:** 2 of 2');
    });

    it('says so when the round produced no readable runtime log', () => {
        const content = buildPromptRunTraceContent({
            ...createTraceOptions(),
            outcome: { kind: 'succeeded', steps: [] },
            runtimeLog: '',
        });

        expect(content).toContain('_This round has produced no readable runtime log._');
    });
});
