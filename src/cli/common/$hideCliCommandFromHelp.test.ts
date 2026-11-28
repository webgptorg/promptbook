import { Command } from 'commander';
import { $hideCliCommandFromHelp } from './$hideCliCommandFromHelp';

describe('$hideCliCommandFromHelp', () => {
    it('takes the command out of the help of its parent command', () => {
        const program = new Command();
        const hiddenCommand = program.command('hidden-one');
        hiddenCommand.description('Hidden command');
        program.command('visible-one').description('Visible command');

        $hideCliCommandFromHelp(hiddenCommand);

        const helpInformation = program.helpInformation();

        expect(helpInformation).toContain('visible-one');
        expect(helpInformation).toContain('Visible command');
        expect(helpInformation).not.toContain('hidden-one');
        expect(helpInformation).not.toContain('Hidden command');
    });

    it('keeps the hidden command runnable and keeps its own help', async () => {
        const program = new Command();
        const hiddenCommand = program.command('hidden-one');
        const hiddenCommandAction = jest.fn();

        hiddenCommand.description('Hidden command');
        hiddenCommand.action(hiddenCommandAction);

        $hideCliCommandFromHelp(hiddenCommand);

        expect(hiddenCommand.helpInformation()).toContain('Hidden command');

        await program.parseAsync(['node', 'test', 'hidden-one'], { from: 'node' });

        expect(hiddenCommandAction).toHaveBeenCalled();
    });
});
