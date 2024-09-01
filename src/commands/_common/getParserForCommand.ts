import { spaceTrim } from 'spacetrim';
import { COMMANDS } from '..';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { Command } from './types/Command';
import { CommandParser } from './types/CommandParser';

/**
 * Gets the parser for the command
 *
 * @returns the parser for the command
 * @throws {UnexpectedError} if the parser is not found
 *
 * @private within the pipelineStringToJson
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
                            .split('\n')
                            .map((line) => `> ${line}`)
                            .join('\n'),
                    )}
                `,
            ),
        );
    }

    return commandParser as CommandParser<TCommand>;
}
