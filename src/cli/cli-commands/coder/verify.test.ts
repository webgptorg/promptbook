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
 */
function createProgramWithVerifyCommand(): Command {
    const program = new Command();
    $initializeCoderVerifyCommand(program);
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

    it('defaults ignore filters to an empty list when --ignore is omitted', async () => {
        const program = createProgramWithVerifyCommand();

        await program.parseAsync(['node', 'test', 'verify'], { from: 'node' });

        expect(getVerifyPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                reverse: false,
                ignore: [],
            }),
        );
    });

    it('passes reverse ordering and repeatable ignore filters through to the verifier', async () => {
        const program = createProgramWithVerifyCommand();

        await program.parseAsync(
            ['node', 'test', 'verify', '--reverse', '--ignore', 'Refactor', '--ignore', 'Fix prompt'],
            {
                from: 'node',
            },
        );

        expect(getVerifyPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                reverse: true,
                ignore: ['Refactor', 'Fix prompt'],
            }),
        );
    });
});
