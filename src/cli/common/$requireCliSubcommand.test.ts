import { Command } from 'commander';
import { $requireCliSubcommand } from './$requireCliSubcommand';

describe('$requireCliSubcommand', () => {
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleInfoSpy.mockRestore();
    });

    it('asks for a subcommand and prints the help when the command is used without one', async () => {
        const writtenHelp: Array<string> = [];
        const childAction = jest.fn();
        const program = new Command();
        const groupCommand = program.command('group');

        groupCommand.description('Group of subcommands');
        groupCommand.exitOverride();
        groupCommand.configureOutput({ writeOut: (text) => void writtenHelp.push(text) });
        groupCommand.command('child').description('One subcommand').action(childAction);

        $requireCliSubcommand(groupCommand);

        await expect(program.parseAsync(['node', 'test', 'group'], { from: 'node' })).rejects.toMatchObject({
            code: 'commander.help',
        });

        expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('Please specify a subcommand.'));
        expect(writtenHelp.join('')).toContain('One subcommand');
        expect(childAction).not.toHaveBeenCalled();
    });
});
