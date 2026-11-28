import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { COMMANDS } from '../index';
import type { Command } from './types/Command';
import type { CommandParser } from './types/CommandParser';

/**
 * Gets the parser for the command
 *
 * @returns the parser for the command
 * @throws {UnexpectedError} if the parser is not found
 *
 * @public exported from `@promptbook/editable`
 */
export function getParserForCommand<TCommand extends Command>(command: TCommand): CommandParser<TCommand> {
    const commandParser = COMMANDS.find((commandParser) => commandParser.name === command.type);

    if (commandParser === undefined) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Command ${command.type} parser is not found

                    ${block(
                        JSON.stringify(command, null, 4)
                            .split(/\r?\n/)
                            .map((line) => `> ${line}`)
                            .join('\n'),
                    )}
                `,
            ),
        );
    }

    return commandParser as CommandParser<TCommand>;
}
