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
            agentName: 'gemini',
            priority: 0,
        });
    });

    it('parses priority and keeps other flags intact', () => {
        const options = parseRunOptions([
            '--agent',
            'openai-codex',
            '--model',
            'gpt-5.2-codex',
            '--priority',
            '3',
            '--no-wait',
            '--ignore-git-changes',
        ]);

        expect(options).toMatchObject({
            waitForUser: false,
            ignoreGitChanges: true,
            agentName: 'openai-codex',
            model: 'gpt-5.2-codex',
            priority: 3,
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
});
