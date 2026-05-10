import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { RunOptions } from '../cli/RunOptions';
import { runCodexPrompts } from './runCodexPrompts';

/**
 * Builds a complete set of run options for focused validation tests.
 */
function createRunOptions(overrides: Partial<RunOptions> = {}): RunOptions {
    return {
        dryRun: false,
        context: undefined,
        testCommand: undefined,
        preserveLogs: false,
        noUi: true,
        thinkingLevel: undefined,
        waitForUser: true,
        noCommit: false,
        ignoreGitChanges: false,
        normalizeLineEndings: true,
        allowCredits: false,
        autoMigrate: false,
        allowDestructiveAutoMigrate: false,
        autoPush: false,
        agentName: 'github-copilot',
        model: 'gpt-5.4',
        priority: 0,
        ...overrides,
    };
}

describe('runCodexPrompts', () => {
    it('rejects --no-commit together with --no-wait unless --ignore-git-changes is also enabled', async () => {
        await expect(
            runCodexPrompts(
                createRunOptions({
                    noCommit: true,
                    waitForUser: false,
                }),
            ),
        ).rejects.toThrow(NotAllowed);

        await expect(
            runCodexPrompts(
                createRunOptions({
                    noCommit: true,
                    waitForUser: false,
                }),
            ),
        ).rejects.toThrow(/--ignore-git-changes/);
    });
});
