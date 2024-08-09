import type { string_markdown_text } from '../../types/typeAliases';
import type { Command } from './types/Command';
import type { CommandUsagePlace } from './types/CommandUsagePlaces';
/**
 * Parses one line of ul/ol to command
 *
 * @returns parsed command object
 * @throws {ParsingError} if the command is invalid
 *
 * @private within the pipelineStringToJson
 */
export declare function parseCommand(raw: string_markdown_text, usagePlace: CommandUsagePlace): Command;
