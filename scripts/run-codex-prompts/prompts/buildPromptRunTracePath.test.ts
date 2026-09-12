import { join } from 'path';
import { buildPromptRunTracePath } from './buildPromptRunTracePath';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Builds a prompt file fixture with enough section metadata for trace-path tests.
 */
function createPromptFile(sections: PromptSection[]): PromptFile {
    return {
        path: join('/project', 'prompts', '2026-09-0180-ptbk-coder-save-traces.md'),
        name: '2026-09-0180-ptbk-coder-save-traces.md',
        lines: ['[ ]', 'Save the run traces'],
        eol: '\n',
        hasFinalEol: true,
        sections,
    };
}

/**
 * Builds one prompt section fixture.
 */
function createPromptSection(index: number): PromptSection {
    return {
        index,
        startLine: 0,
        endLine: 1,
        status: 'todo',
        priority: 0,
    };
}

describe('buildPromptRunTracePath', () => {
    it('names the trace of a single-section prompt exactly like its prompt file', () => {
        const section = createPromptSection(0);
        const file = createPromptFile([section]);

        expect(buildPromptRunTracePath(file, section)).toBe(
            join('/project', 'prompts', 'traces', '2026-09-0180-ptbk-coder-save-traces.md'),
        );
    });

    it('keeps section suffixes for multi-section prompt files', () => {
        const firstSection = createPromptSection(0);
        const secondSection = createPromptSection(1);
        const file = createPromptFile([firstSection, secondSection]);

        expect(buildPromptRunTracePath(file, secondSection)).toBe(
            join('/project', 'prompts', 'traces', '2026-09-0180-ptbk-coder-save-traces-2.md'),
        );
    });

    it('stores the trace next to the prompts directory the prompt itself lives in', () => {
        const section = createPromptSection(0);
        const file = {
            ...createPromptFile([section]),
            path: join('/other-project', 'backlog', 'task.md'),
            name: 'task.md',
        };

        expect(buildPromptRunTracePath(file, section)).toBe(join('/other-project', 'backlog', 'traces', 'task.md'));
    });
});
