import colors from 'colors';
import type { Command } from 'commander';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';

/**
 * Initializes testing `hello` command for Promptbook CLI utilities
 *
 * @private part of `promptbookCli`
 */
export function initializeHello(program: Command) {
    const helloCommand = program.command('hello');
    helloCommand.description(
        spaceTrim(`
          Just command for testing
      `),
    );

    helloCommand.argument('<name>', 'Your name');
    helloCommand.option('-g, --greeting <greeting>', `Greeting`, 'Hello');

    helloCommand.action(async (name, { greeting }) => {
        console.info(colors.cyan(`${greeting} ${name}`));
        await forTime(1000);
        console.info(colors.rainbow(`Nice to meet you!`));
        process.exit(0);
    });
}
