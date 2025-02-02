import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';

/**
 * Initializes testing `hello` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeHelloCommand(program: Program) {
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
        return process.exit(0);
    });
}

/**
 * TODO: [🧠][🐣] Make here some easter egg with generated hello greeting via LLM models
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
