import { spaceTrim } from 'spacetrim';
import { SyntaxError } from '../../errors/SyntaxError';
import type { string_markdown_text } from '../../types/typeAliases';
import { removeMarkdownFormatting } from '../../utils/markdown/removeMarkdownFormatting';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { COMMANDS } from '../index';
import type { Command } from './types/Command';
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
        .split(/["'`]/)
        .join('')
        // Note: [🛵]:
        .split(/^http/)
        .join('URL http')
        .split(' ')
        .map((part) => part.trim())
        .filter((item) => item !== '')
        // Note: [📇]:
        .filter((item) => !/^PTBK$/i.test(item))
        .filter((item) => !/^PIPELINE$/i.test(item))
        .filter((item) => !/^PROMPTBOOK$/i.test(item))
        .map(removeMarkdownFormatting);

    const [commandNameRaw, ...args] = items;

    const getSupportedCommandsMessage = () =>
        COMMANDS.map(({ name, aliasNames: aliases, description }) =>
            spaceTrim(
                `
                    - **${name}**${aliases ? ` *(${aliases.join(', ')})*` : ''} ${description}
                `,
            ),
        ).join('\n');

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

    throw new SyntaxError(
        spaceTrim(
            (block) =>
                `
                    Malformed or unknown command ${commandName}:

                    - ${raw}

                    Supported commands are:
                    ${block(getSupportedCommandsMessage())}

                `,
        ),
    );
}
