import type { string_markdown_text } from '../../types/typeAliases';
import { getParserForCommand } from './getParserForCommand';
import type { Command } from './types/Command';

/**
 * Stringifies the command
 *
 * @returns stringified command
 * @throws {UnexpectedError} if the command is invalid
 *
 * @private within the pipelineStringToJson
 */
export function stringifyCommand(command: Command): string_markdown_text {
    const commandParser = getParserForCommand(command);
    return commandParser.stringify(command);
}
