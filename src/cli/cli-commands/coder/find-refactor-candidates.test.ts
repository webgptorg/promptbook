import { Command } from 'commander';
import { findRefactorCandidates } from '../../../../scripts/find-refactor-candidates/find-refactor-candidates';
import { $initializeCoderFindRefactorCandidatesCommand } from './find-refactor-candidates';

jest.mock('../../../../scripts/find-refactor-candidates/find-refactor-candidates', () => ({
    findRefactorCandidates: jest.fn(),
}));

/**
 * Typed Jest mock for the refactor-candidate finder entrypoint.
 */
function getFindRefactorCandidatesMock(): jest.MockedFunction<typeof findRefactorCandidates> {
    return findRefactorCandidates as jest.MockedFunction<typeof findRefactorCandidates>;
}

/**
 * Creates a Commander program with the `coder find-refactor-candidates` command registered.
 */
function createProgramWithFindRefactorCandidatesCommand(): Command {
    const program = new Command();
    $initializeCoderFindRefactorCandidatesCommand(program);
    return program;
}

describe('$initializeCoderFindRefactorCandidatesCommand', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        getFindRefactorCandidatesMock().mockResolvedValue(undefined);
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('defaults the scan level to medium when --level is omitted', async () => {
        const program = createProgramWithFindRefactorCandidatesCommand();

        await program.parseAsync(['node', 'test', 'find-refactor-candidates'], { from: 'node' });

        expect(getFindRefactorCandidatesMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'medium',
            }),
        );
    });

    it('passes the configured scan level through to the finder', async () => {
        const program = createProgramWithFindRefactorCandidatesCommand();

        await program.parseAsync(['node', 'test', 'find-refactor-candidates', '--level', 'xhigh'], {
            from: 'node',
        });

        expect(getFindRefactorCandidatesMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'xhigh',
            }),
        );
    });
});
