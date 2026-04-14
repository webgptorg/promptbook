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
        const options = parseRunOptions(['--agent', 'gemini']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'gemini',
            priority: 0,
            normalizeLineEndings: true,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
            isTerminalUiEnabled: false,
        });
    });

    it('parses GitHub Copilot as a supported runner', () => {
        const options = parseRunOptions(['--agent', 'github-copilot', '--model', 'gpt-5.4']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            model: 'gpt-5.4',
            priority: 0,
            normalizeLineEndings: true,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
            isTerminalUiEnabled: false,
        });
    });

    it('allows running without --agent in dry-run mode', () => {
        const options = parseRunOptions(['--dry-run']);

        expect(options).toMatchObject({
            dryRun: true,
            agentName: undefined,
            priority: 0,
            normalizeLineEndings: true,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
            isTerminalUiEnabled: false,
        });
    });

    it('parses priority and keeps other flags intact', () => {
        const options = parseRunOptions([
            '--agent',
            'openai-codex',
            '--model',
            'gpt-5.2-codex',
            '--context',
            'AGENTS.md',
            '--priority',
            '3',
            '--no-wait',
            '--ignore-git-changes',
        ]);

        expect(options).toMatchObject({
            dryRun: false,
            waitForUser: false,
            ignoreGitChanges: true,
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

    it('parses inline context instructions', () => {
        const options = parseRunOptions(['--agent', 'gemini', '--context', 'Follow AGENTS instructions']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'gemini',
            context: 'Follow AGENTS instructions',
            normalizeLineEndings: true,
        });
    });

    it('parses an unquoted verification command and stops at the next top-level flag', () => {
        const options = parseRunOptions([
            '--agent',
            'github-copilot',
            '--test',
            'npm',
            'run',
            'test',
            '--no-wait',
        ]);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            testCommand: 'npm run test',
            waitForUser: false,
        });
    });

    it('parses thinking level for supported runners', () => {
        const options = parseRunOptions(['--agent', 'github-copilot', '--thinking-level', 'xhigh']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'github-copilot',
            thinkingLevel: 'xhigh',
            normalizeLineEndings: true,
        });
    });

    it('parses --dry-run with other flags', () => {
        const options = parseRunOptions(['--dry-run', '--priority', '2', '--no-wait']);

        expect(options).toMatchObject({
            dryRun: true,
            waitForUser: false,
            priority: 2,
            normalizeLineEndings: true,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('allows disabling automatic line-ending normalization', () => {
        const options = parseRunOptions(['--agent', 'gemini', '--no-normalize-line-endings']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'gemini',
            normalizeLineEndings: false,
            allowCredits: false,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('enables credit spending when --allow-credits is provided', () => {
        const options = parseRunOptions(['--agent', 'openai-codex', '--allow-credits']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'openai-codex',
            allowCredits: true,
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('enables automatic testing-server migrations when --auto-migrate is provided', () => {
        const options = parseRunOptions(['--agent', 'openai-codex', '--auto-migrate']);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'openai-codex',
            autoMigrate: true,
            allowDestructiveAutoMigrate: false,
        });
    });

    it('allows destructive migration override when explicitly requested', () => {
        const options = parseRunOptions([
            '--agent',
            'openai-codex',
            '--auto-migrate',
            '--allow-destructive-auto-migrate',
        ]);

        expect(options).toMatchObject({
            dryRun: false,
            agentName: 'openai-codex',
            autoMigrate: true,
            allowDestructiveAutoMigrate: true,
        });
    });

    it('rejects invalid priority values', () => {
        expect(() => parseRunOptions(['--agent', 'gemini', '--priority', 'invalid'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects missing priority value', () => {
        expect(() => parseRunOptions(['--agent', 'gemini', '--priority'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects missing verification commands', () => {
        expect(() => parseRunOptions(['--agent', 'github-copilot', '--test'])).toThrow('process.exit');
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects invalid thinking level values', () => {
        expect(() => parseRunOptions(['--agent', 'openai-codex', '--thinking-level', 'extreme'])).toThrow(
            'process.exit',
        );
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });
});
