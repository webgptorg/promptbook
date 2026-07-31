import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';
import {
    buildCoderIsolationBranchName,
    buildCoderIsolationTaskName,
    buildCoderIsolationWorktreeDisplayPath,
    buildCoderIsolationWorktreePath,
} from './coderIsolationNaming';

/**
 * Creates one prompt file fixture with the requested number of sections.
 */
function createPromptFile(sectionCount: number): PromptFile {
    const sections: PromptSection[] = Array.from({ length: sectionCount }, (_, index) => ({
        index,
        startLine: index,
        endLine: index,
        status: 'todo',
        priority: 0,
        statusLineIndex: index,
    }));

    return {
        path: 'C:\\project\\prompts\\2026-07-0700-ptbk-coder-timing.md',
        name: '2026-07-0700-ptbk-coder-timing.md',
        lines: [],
        eol: '\n',
        hasFinalEol: true,
        sections,
    };
}

describe('buildCoderIsolationTaskName', () => {
    it('uses the bare prompt file name for single-section prompt files', () => {
        const file = createPromptFile(1);

        expect(buildCoderIsolationTaskName(file, file.sections[0]!)).toBe('2026-07-0700-ptbk-coder-timing');
    });

    it('appends the section number for prompt files with more sections', () => {
        const file = createPromptFile(3);

        expect(buildCoderIsolationTaskName(file, file.sections[2]!)).toBe('2026-07-0700-ptbk-coder-timing-3');
    });
});

describe('buildCoderIsolationBranchName', () => {
    it('prefixes the task name with the isolation branch namespace', () => {
        expect(buildCoderIsolationBranchName('2026-07-0700-ptbk-coder-timing')).toBe(
            'ptbk-coder-isolation/2026-07-0700-ptbk-coder-timing',
        );
    });
});

describe('buildCoderIsolationWorktreePath', () => {
    it('places the worktree inside the Promptbook temporary folder of the project', () => {
        expect(buildCoderIsolationWorktreePath('C:\\project', '2026-07-0700-ptbk-coder-timing')).toBe(
            'C:\\project/.promptbook/coder-isolation-worktrees/2026-07-0700-ptbk-coder-timing',
        );
    });
});

describe('buildCoderIsolationWorktreeDisplayPath', () => {
    it('builds the project-relative worktree path', () => {
        expect(buildCoderIsolationWorktreeDisplayPath('2026-07-0700-ptbk-coder-timing')).toBe(
            '.promptbook/coder-isolation-worktrees/2026-07-0700-ptbk-coder-timing',
        );
    });
});
