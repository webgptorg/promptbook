import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../errors/NotAllowed';

/**
 * Creates a Commander argument parser that accepts only positive integers.
 *
 * The returned parser is meant to be passed as the coercion callback of `command.option(...)`.
 * It throws a branded `NotAllowed` error with a clear message referencing the given option name
 * when the provided value is not a positive integer.
 *
 * @private internal utility of `promptbookCli`
 */
export function createPositiveIntegerOptionParser(optionName: string): (value: string) => number {
    return (value: string): number => {
        const parsedValue = Number(value);

        if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
            throw new NotAllowed(
                spaceTrim(`
                    Invalid value for \`${optionName}\`: \`${value}\`.

                    Use a positive integer.
                `),
            );
        }

        return parsedValue;
    };
}

// Note: [🟡] Code for CLI option parser [createPositiveIntegerOptionParser](src/cli/cli-commands/common/createPositiveIntegerOptionParser.ts) should never be published outside of `@promptbook/cli`
