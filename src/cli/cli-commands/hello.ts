import colors from 'colors';
import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';

/**
 * Initializes testing `hello` command for Promptbook CLI utilities
 *
 * @private internal function of `promptbookCli`
 */
export function initializeHelloCommand(program: Program) {
    const helloCommand = program.command('hello');
    helloCommand.description(
        spaceTrim(`
            Just command for testing
      `),
    );

    helloCommand.argument('[name]', 'Your name', 'Paul');
    helloCommand.option('-g, --greeting <greeting>', `Greeting`, 'Hello');

    helloCommand.action(async (name, { greeting }) => {
        console.info(colors.cyan(`${greeting} ${name}`));
        await forTime(1000);
        console.info(colors.rainbow(`Nice to meet you!`));
        process.exit(0);
    });
}

/**
 * Note: [🟡] This code should never be published outside of `@promptbook/cli`
 */
