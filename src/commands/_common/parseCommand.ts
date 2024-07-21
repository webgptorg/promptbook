import { spaceTrim } from 'spacetrim';
import { SyntaxError } from '../../errors/SyntaxError';
import type { string_markdown, string_markdown_text } from '../../types/typeAliases';
import { removeMarkdownFormatting } from '../../utils/markdown/removeMarkdownFormatting';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { COMMANDS } from '../index';
import type { Command } from './types/Command';
import { CommandParserInput } from './types/CommandParser';
import { CommandUsagePlace } from './types/CommandUsagePlaces';

/**
 * Parses one line of ul/ol to command
 *
 * @returns parsed command object
 * @throws {SyntaxError} if the command is invalid
 *
 * @private within the pipelineStringToJson
 */
export function parseCommand(raw: string_markdown_text, usagePlace: CommandUsagePlace): Command {
    if (raw.includes('\n') || raw.includes('\r')) {
        throw new SyntaxError('Command can not contain new line characters:');
    }

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
        // Note: [📇]:
        .filter((item) => !/^PTBK$/i.test(item))
        .filter((item) => !/^PIPELINE$/i.test(item))
        .filter((item) => !/^PROMPTBOOK$/i.test(item))
        .map(removeMarkdownFormatting);

    for (
        let commandNameSegmentsCount = 0;
        commandNameSegmentsCount < Math.min(items.length, 3);
        commandNameSegmentsCount++
    ) {
        const commandNameRaw = items.slice(0, commandNameSegmentsCount + 1).join('_');
        const args = items.slice(commandNameSegmentsCount + 1);
        const command = parseCommandVariant({ usagePlace, raw, normalized, args, commandNameRaw });

        if (command !== null) {
            return command;
        }
    }

    throw new SyntaxError(
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
 * !!!
 */
function getSupportedCommandsMessage(): string_markdown {
    return COMMANDS.flatMap(({ name, aliasNames, description }) => [
        `- **${name}** ${description}`,
        ...(aliasNames || []).map((aliasName) => `    - **${aliasName}** Alias for **${name}**`),
    ]).join('\n');
}

/**
 * !!!
 */
function parseCommandVariant(input: CommandParserInput & { commandNameRaw: string | undefined }): Command | null {
    const { commandNameRaw, usagePlace, normalized, args, raw } = input;

    if (commandNameRaw === undefined) {
        throw new SyntaxError(
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

    const commandName = normalizeTo_SCREAMING_CASE(commandNameRaw);

    for (const commandParser of COMMANDS.filter(({ usagePlaces: places }) => places.includes(usagePlace))) {
        const { name, aliasNames: aliases, parse } = commandParser;
        const names = [name, ...(aliases || [])];
        // console.log('!!!', { commandName, names });
        if (names.includes(commandName)) {
            try {
                return parse({ usagePlace, raw, normalized, args });
            } catch (error) {
                if (!(error instanceof SyntaxError)) {
                    throw error;
                }

                throw new SyntaxError(
                    spaceTrim(
                        (block) =>
                            `
                              Invalid ${commandName} command:
                              ${block((error as SyntaxError).message)}

                              - ${raw}

                              Usage of ${commandName}:
                              ${block(commandParser.examples.join('\n'))}

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
