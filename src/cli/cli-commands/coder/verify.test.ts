import { Command } from 'commander';
import { verifyPrompts } from '../../../../scripts/verify-prompts/verify-prompts';
import { $initializeCoderVerifyCommand } from './verify';

jest.mock('../../../../scripts/verify-prompts/verify-prompts', () => ({
    verifyPrompts: jest.fn(),
}));

/**
 * Typed Jest mock for the prompt verification entrypoint.
 */
function getVerifyPromptsMock(): jest.MockedFunction<typeof verifyPrompts> {
    return verifyPrompts as jest.MockedFunction<typeof verifyPrompts>;
}

/**
 * Creates a Commander program with the `coder verify` subcommand registered.
 *
 * Note: Commander is prevented from ending the test process and from writing its errors into the test output
 */
function createProgramWithVerifyCommand(): Command {
    const program = new Command();
    $initializeCoderVerifyCommand(program);

    for (const command of [program, ...program.commands]) {
        command.exitOverride();
        command.configureOutput({ writeErr: () => undefined });
    }

    return program;
}

describe('$initializeCoderVerifyCommand', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        getVerifyPromptsMock().mockResolvedValue(undefined);
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('defaults the order to from-earliest and ignore filters to an empty list when the options are omitted', async () => {
        const program = createProgramWithVerifyCommand();

        await program.parseAsync(['node', 'test', 'verify'], { from: 'node' });

        expect(getVerifyPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                order: 'from-earliest',
                ignore: [],
            }),
        );
    });

    it('passes the requested order and repeatable ignore filters through to the verifier', async () => {
        const program = createProgramWithVerifyCommand();

        await program.parseAsync(
            ['node', 'test', 'verify', '--order', 'from-latest', '--ignore', 'Refactor', '--ignore', 'Fix prompt'],
            {
                from: 'node',
            },
        );

        expect(getVerifyPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                order: 'from-latest',
                ignore: ['Refactor', 'Fix prompt'],
            }),
        );
    });

    it('passes the random order through to the verifier', async () => {
        const program = createProgramWithVerifyCommand();

        await program.parseAsync(['node', 'test', 'verify', '--order', 'random'], { from: 'node' });

        expect(getVerifyPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                order: 'random',
            }),
        );
    });

    it('refuses an unsupported order value', async () => {
        const program = createProgramWithVerifyCommand();

        await expect(
            program.parseAsync(['node', 'test', 'verify', '--order', 'from-nowhere'], { from: 'node' }),
        ).rejects.toThrow(/from-nowhere/);

        expect(getVerifyPromptsMock()).not.toHaveBeenCalled();
    });

    it('keeps git untouched when no git synchronization flag is used', async () => {
        const program = createProgramWithVerifyCommand();

        await program.parseAsync(['node', 'test', 'verify'], { from: 'node' });

        expect(getVerifyPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                gitSync: {
                    isCommitEnabled: false,
                    isAutoPushEnabled: false,
                    isAutoPullEnabled: false,
                },
            }),
        );
    });

    it('passes the git synchronization flags through to the verifier', async () => {
        const program = createProgramWithVerifyCommand();

        await program.parseAsync(['node', 'test', 'verify', '--commit', '--auto-push', '--auto-pull'], {
            from: 'node',
        });

        expect(getVerifyPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                gitSync: {
                    isCommitEnabled: true,
                    isAutoPushEnabled: true,
                    isAutoPullEnabled: true,
                },
            }),
        );
    });
});
