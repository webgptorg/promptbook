import { parseRunOptions } from './parseRunOptions';

/**
 * Creates a process.exit mock that throws, so tests can assert exit flows.
 */
function mockProcessExit(): jest.SpyInstance<never, [code?: string | number | null | undefined]> {
    return jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
    }) as never);
}

describe('parseRunOptions', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        processExitSpy = mockProcessExit();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('defaults priority to zero when the flag is not provided', () => {
        const options = parseRunOptions(['--harness', 'gemini']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'gemini',
            priority: 0,
            noCommit: false,
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            normalizeLineEndings: true,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('parses GitHub Copilot as a supported runner', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--model', 'gpt-5.4']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            model: 'gpt-5.4',
            priority: 0,
            noCommit: false,
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            normalizeLineEndings: true,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('allows running without --harness in dry-run mode', () => {
        const options = parseRunOptions(['--dry-run']);

        expect(options).toMatchObject({
            dryRun: true,
            agentName: undefined,
            priority: 0,
            noCommit: false,
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            normalizeLineEndings: true,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('parses priority and keeps other flags intact', () => {
        const options = parseRunOptions([
            '--harness',
            'openai-codex',
            '--model',
            'gpt-5.2-codex',
            '--context',
            'AGENTS.md',
            '--priority',
            '3',
            '--ignore-git-changes',
        ]);

        expect(options).toMatchObject({
            dryRun: false,
            waitForUser: false,
            ignoreGitChanges: true,
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            normalizeLineEndings: true,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
            agentName: 'openai-codex',
            model: 'gpt-5.2-codex',
            context: 'AGENTS.md',
            priority: 3,
        });
    });

    it('parses run limit when provided', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--limit', '2']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            limit: 2,
        });
    });

    it('leaves changes uncommitted only when --no-commit is provided', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--no-commit']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            noCommit: true,
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
        });
    });

    it('parses inline context instructions', () => {
        const options = parseRunOptions(['--harness', 'gemini', '--context', 'Follow AGENTS instructions']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'gemini',
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            context: 'Follow AGENTS instructions',
            normalizeLineEndings: true,
        });
    });

    it('parses an unquoted verification command and stops at the next top-level flag', () => {
        const options = parseRunOptions([
            '--harness',
            'github-copilot',
            '--test',
            'npm',
            'run',
            'test',
            '--no-auto',
        ]);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            testCommand: 'npm run test',
            waitForUser: true,
        });
    });

    it('parses thinking level for supported runners', () => {
        const options = parseRunOptions(['--harness', 'claude-code', '--thinking-level', 'max']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'claude-code',
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            thinkingLevel: 'max',
            normalizeLineEndings: true,
        });
    });

    it('parses --dry-run with other flags', () => {
        const options = parseRunOptions(['--dry-run', '--priority', '2', '--no-auto']);

        expect(options).toMatchObject({
            dryRun: true,
            waitForUser: true,
            priority: 2,
            noCommit: false,
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            normalizeLineEndings: true,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('enables automatic git push only when --auto-push is provided', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--auto-push']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            autoPush: true,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
        });
    });

    it('enables automatic git pull only when --auto-pull is provided', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--auto-pull']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            autoPush: false,
            autoPull: true,
            preserveLogs: false,
            noUi: false,
        });
    });

    it('preserves temp prompt artifacts only when --preserve-logs is provided', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--preserve-logs']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            autoPush: false,
            autoPull: false,
            preserveLogs: true,
            noUi: false,
        });
    });

    it('disables the terminal UI only when --no-ui is provided', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--no-ui']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: true,
        });
    });

    it('allows disabling automatic line-ending normalization', () => {
        const options = parseRunOptions(['--harness', 'gemini', '--no-normalize-line-endings']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'gemini',
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            normalizeLineEndings: false,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('enables credit spending when --allow-credits is provided', () => {
        const options = parseRunOptions(['--harness', 'openai-codex', '--allow-credits']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'openai-codex',
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            allowCredits: true,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('enables automatic testing-server migrations when --auto-migrate is provided', () => {
        const options = parseRunOptions(['--harness', 'openai-codex', '--auto-migrate']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'openai-codex',
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            autoMigrate: true,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('allows destructive migration override when explicitly requested', () => {
        const options = parseRunOptions([
            '--harness',
            'openai-codex',
            '--auto-migrate',
            '--allow-destructive-auto-migrate',
        ]);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'openai-codex',
            autoPush: false,
            autoPull: false,
            preserveLogs: false,
            noUi: false,
            autoMigrate: true,
            allowDestructiveAutoMigrate: true,
        });
    });

    it('defaults to no per-prompt waiting and 10 minutes wait-after-error when no wait flags are provided', () => {
        const options = parseRunOptions(['--harness', 'gemini']);

        expect(options).toMatchObject({
            waitForUser: false,
            waitAfterPrompt: 0,
            waitBetweenPrompts: 0,
            waitAfterError: 600_000,
        });
    });

    it('enables user-confirmation wait when --no-auto is provided', () => {
        const options = parseRunOptions(['--harness', 'gemini', '--no-auto']);

        expect(options).toMatchObject({
            waitForUser: true,
            waitAfterPrompt: 0,
            waitBetweenPrompts: 0,
            waitAfterError: 600_000,
        });
    });

    it('rejects --wait-after-prompt when no duration value is provided', () => {
        expect(() => parseRunOptions(['--harness', 'gemini', '--wait-after-prompt'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects --wait-between-prompts when no duration value is provided', () => {
        expect(() => parseRunOptions(['--harness', 'gemini', '--wait-between-prompts'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects --wait-after-error when no duration value is provided', () => {
        expect(() => parseRunOptions(['--harness', 'gemini', '--wait-after-error'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('sets time-based wait when --wait-after-prompt is provided with a duration in hours', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--wait-after-prompt', '1h']);

        expect(options).toMatchObject({
            waitForUser: false,
            waitAfterPrompt: 3_600_000,
            waitBetweenPrompts: 0,
            waitAfterError: 600_000,
        });
    });

    it('sets time-based wait when --wait-between-prompts is provided with a duration in minutes', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--wait-between-prompts', '30m']);

        expect(options).toMatchObject({
            waitForUser: false,
            waitAfterPrompt: 0,
            waitBetweenPrompts: 1_800_000,
            waitAfterError: 600_000,
        });
    });

    it('sets time-based wait when --wait-after-error is provided with a combined duration', () => {
        const options = parseRunOptions(['--harness', 'github-copilot', '--wait-after-error', '1h30m']);

        expect(options).toMatchObject({
            waitForUser: false,
            waitAfterPrompt: 0,
            waitBetweenPrompts: 0,
            waitAfterError: 5_400_000,
        });
    });

    it('combines --no-auto with time-based wait flags', () => {
        const options = parseRunOptions([
            '--harness',
            'github-copilot',
            '--no-auto',
            '--wait-after-prompt',
            '5s',
            '--wait-between-prompts',
            '30m',
            '--wait-after-error',
            '10m',
        ]);

        expect(options).toMatchObject({
            waitForUser: true,
            waitAfterPrompt: 5_000,
            waitBetweenPrompts: 1_800_000,
            waitAfterError: 600_000,
        });
    });

    it('rejects invalid priority values', () => {
        expect(() => parseRunOptions(['--harness', 'gemini', '--priority', 'invalid'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects missing priority value', () => {
        expect(() => parseRunOptions(['--harness', 'gemini', '--priority'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects invalid limit values', () => {
        expect(() => parseRunOptions(['--harness', 'gemini', '--limit', '0'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects missing limit value', () => {
        expect(() => parseRunOptions(['--harness', 'gemini', '--limit'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects missing verification commands', () => {
        expect(() => parseRunOptions(['--harness', 'github-copilot', '--test'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects invalid thinking level values', () => {
        expect(() => parseRunOptions(['--harness', 'openai-codex', '--thinking-level', 'extreme'])).toThrow(
            'process.exit',
        );
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });
});
