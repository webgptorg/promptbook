import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../errors/ParseError';
import type { string_markdown, string_markdown_text } from '../../types/typeAliases';
import { removeMarkdownFormatting } from '../../utils/markdown/removeMarkdownFormatting';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { just } from '../../utils/organization/just';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { really_unknown } from '../../utils/organization/really_unknown';
import { COMMANDS } from '../index';
import type { Command } from './types/Command';
import type { CommandBase, CommandParser, CommandParserInput } from './types/CommandParser';
import type { CommandUsagePlace } from './types/CommandUsagePlaces';

/**
 * Parses one line of ul/ol to command
 *
 * @returns parsed command object
 * @throws {ParseError} if the command is invalid
 *
 * @private within the pipelineStringToJson
 */
export function parseCommand(raw: string_markdown_text, usagePlace: CommandUsagePlace): Command {
    if (raw.includes('\n') || raw.includes('\r')) {
        throw new ParseError('Command can not contain new line characters' /* <- TODO: [🚞] */);
    }

    // TODO: Unit test all this processing and parsing
    let normalized = raw.trim();
    normalized = normalized.split('`').join('');
    normalized = normalized.split('"').join('');
    normalized = normalized.split("'").join('');
    normalized = normalized.split('~').join('');
    normalized = normalized.split('[').join('');
    normalized = normalized.split(']').join('');
    normalized = normalized.split('(').join('');
    normalized = normalized.split(')').join('');
    normalized = normalizeTo_SCREAMING_CASE(normalized);
    normalized = normalized.split('DIALOGUE').join('DIALOG');

    const items = raw
        .trim()
        // Note: [🐡]
        .split(/^>/)
        .join('')
        // ---
        .trim()
        .split(/["'`]/)
        .join('')
        .trim()

        // Note: [🛵]:
        .split(/^http/)
        .join('URL http')
        // ---
        // Note: [🦈]
        .split(/^{/)
        .join('PARAMETER {')
        // ---
        .split(' ')
        .map((part) => part.trim())
        .filter((item) => item !== '')

        .map(removeMarkdownFormatting)
        .map((item) => item.trim());

    if (items.length === 0 || items[0] === '') {
        throw new ParseError(
            spaceTrim(
                (block) =>
                    `
                        Malformed command:
                        - ${raw}

                        Supported commands are:
                        ${block(getSupportedCommandsMessage())}

                    `,
            ),
        );
    }

    // Note: Taking command name from beginning of the line
    //       FOO | BAR   Arg1   Arg2   Arg3
    //       FOO   BAR | Arg1   Arg2   Arg3
    for (
        let commandNameSegmentsCount = 0;
        commandNameSegmentsCount < Math.min(items.length, 3);
        commandNameSegmentsCount++
    ) {
        const commandNameRaw = items.slice(0, commandNameSegmentsCount + 1).join('_');
        const args = items.slice(commandNameSegmentsCount + 1);

        const rawArgs = raw
            .substring(
                commandNameRaw.length,
                // <- TODO: [🥶] This is not correct in case [🐡] and [🦈]
            )
            .trim();
        const command = parseCommandVariant({ usagePlace, raw, rawArgs, normalized, args, commandNameRaw });

        if (command !== null) {
            return command;
        }
    }

    // Note: Taking command name from end of the line
    //        Arg1   Arg2   Arg3 | FOO
    {
        const commandNameRaw = items.slice(-1).join('_');
        const args = items.slice(0, -1); // <- Note: This is probbably not correct

        const rawArgs = raw
            .substring(
                0,
                raw.length - commandNameRaw.length,
                // <- TODO: [🥶] This is MAYBE not correct in case [🐡] and [🦈]
            )
            .trim();
        const command = parseCommandVariant({ usagePlace, raw, rawArgs, normalized, args, commandNameRaw });

        if (command !== null) {
            return command;
        }
    }

    throw new ParseError(
        spaceTrim(
            (block) =>
                `
                  Malformed or unknown command:
                  - ${raw}

                  Supported commands are:
                  ${block(getSupportedCommandsMessage())}

              `,
        ),
    );
}

/**
 * @@@
 */
function getSupportedCommandsMessage(): string_markdown {
    return COMMANDS.flatMap(({ name, aliasNames, description, documentationUrl }: CommandParser<CommandBase>) =>
        //                                                                        <- Note: [🦦] Its strange that this type assertion is needed
        [
            `- **${name}** ${description}, see [discussion](${documentationUrl})`,
            ...(aliasNames || []).map((aliasName) => `    - **${aliasName}** Alias for **${name}**`),
        ],
    ).join('\n');
}

/**
 * @@@
 */
function parseCommandVariant(input: CommandParserInput & { commandNameRaw: string }): Command | null {
    const { commandNameRaw, usagePlace, normalized, args, raw, rawArgs } = input;

    const commandName = normalizeTo_SCREAMING_CASE(commandNameRaw);

    for (const commandParser of COMMANDS as really_unknown as Array<CommandParser<CommandBase>>) {
        //                               <- Note: [🦦] Its strange that this type assertion is needed
        const { name, isUsedInPipelineHead, isUsedInPipelineTemplate, aliasNames, deprecatedNames, parse } =
            commandParser;

        if (just(false)) {
            keepUnused(/* for better indentation */);
        } else if (usagePlace === 'PIPELINE_HEAD' && !isUsedInPipelineHead) {
            continue;
        } else if (usagePlace === 'PIPELINE_TEMPLATE' && !isUsedInPipelineTemplate) {
            continue;
        }

        const names = [name, ...(aliasNames || []), ...(deprecatedNames || [])];
        if (names.includes(commandName)) {
            try {
                return parse({ usagePlace, raw, rawArgs, normalized, args }) as Command; // <- Note: [🦦]
            } catch (error) {
                if (!(error instanceof ParseError)) {
                    throw error;
                }

                throw new ParseError(
                    spaceTrim(
                        (block) =>
                            `
                              Invalid ${commandName} command:

                              Your command:
                              - ${raw}

                              The detailed error:
                              ${block((error as ParseError).message)}

                              Usage of ${commandName}:
                              ${block(commandParser.examples.map((example) => `- ${example}`).join('\n'))}

                              All supported commands are:
                              ${block(getSupportedCommandsMessage())}

                          `,
                    ),
                );
            }
        }
    }

    return null;
}
