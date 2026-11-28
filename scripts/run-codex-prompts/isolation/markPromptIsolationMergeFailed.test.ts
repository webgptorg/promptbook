import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';
import { markPromptIsolationMergeFailed } from './markPromptIsolationMergeFailed';

/**
 * Builds one isolation worktree fixture.
 */
function createWorktree(): CoderIsolationWorktree {
    return {
        taskName: '2026-07-0700-ptbk-coder-timing',
        projectPath: 'C:\\project',
        worktreePath: 'C:\\project/.promptbook/coder-isolation-worktrees/2026-07-0700-ptbk-coder-timing',
        worktreeDisplayPath: '.promptbook/coder-isolation-worktrees/2026-07-0700-ptbk-coder-timing',
        branchName: 'ptbk-coder-isolation/2026-07-0700-ptbk-coder-timing',
        baseBranchName: 'main',
    };
}

/**
 * Builds one prompt file fixture holding a single status line.
 */
function createPromptFile(statusLine: string): { file: PromptFile; section: PromptSection } {
    const section: PromptSection = {
        index: 0,
        startLine: 0,
        endLine: 1,
        status: 'done',
        priority: 0,
        statusLineIndex: 0,
    };

    const file: PromptFile = {
        path: 'C:\\project\\prompts\\2026-07-0700-ptbk-coder-timing.md',
        name: '2026-07-0700-ptbk-coder-timing.md',
        lines: [statusLine, 'Task body'],
        eol: '\n',
        hasFinalEol: true,
        sections: [section],
    };

    return { file, section };
}

describe('markPromptIsolationMergeFailed', () => {
    it('turns the done status into a failed status and keeps the recorded runner metadata', () => {
        const { file, section } = createPromptFile('[x] by github-copilot gpt-5.4 xhigh - Step ~$0.10 2 minutes');

        markPromptIsolationMergeFailed(file, section, createWorktree());

        expect(file.lines[0]).toBe(
            '[x] by github-copilot gpt-5.4 xhigh - Step ~$0.10 2 minutes'.replace('[x]', '[!]') +
                ' - merge into `main` failed, merge `ptbk-coder-isolation/2026-07-0700-ptbk-coder-timing` from `.promptbook/coder-isolation-worktrees/2026-07-0700-ptbk-coder-timing` manually',
        );
    });

    it('keeps the original indentation of the status line', () => {
        const { file, section } = createPromptFile('   [x] by github-copilot');

        markPromptIsolationMergeFailed(file, section, createWorktree());

        expect(file.lines[0]).toMatch(/^ {3}\[!\] by github-copilot - merge into `main` failed/u);
    });

    it('throws when the prompt section has no status line', () => {
        const { file, section } = createPromptFile('[x] by github-copilot');

        expect(() => markPromptIsolationMergeFailed(file, { ...section, statusLineIndex: undefined }, createWorktree()))
            .toThrow(/does not have a status line/u);
    });
});
