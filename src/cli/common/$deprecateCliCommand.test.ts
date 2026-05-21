import { Command } from 'commander';
import { $deprecateCliCommand } from './$deprecateCliCommand';

describe('$deprecateCliCommand', () => {
    let consoleWarnSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    it('adds deprecation guidance to help output and warns when the command is used', async () => {
        const program = new Command();
        const deprecatedCommand = program.command('legacy');
        deprecatedCommand.description('Legacy command');
        deprecatedCommand.action(() => undefined);

        $deprecateCliCommand(deprecatedCommand, 'Use `ptbk replacement` instead.');

        expect(program.helpInformation()).toContain('Deprecated: Use `ptbk replacement` instead.');

        await program.parseAsync(['node', 'test', 'legacy'], { from: 'node' });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Warning: `ptbk legacy` is deprecated. Use `ptbk replacement` instead.'),
        );
    });
});
