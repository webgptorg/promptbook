import { spaceTrim } from 'spacetrim';
import { COMMANDS } from '..';
import { SyntaxError } from '../../errors/SyntaxError';
import type { string_markdown_text } from '../../types/typeAliases';
import { removeMarkdownFormatting } from '../../utils/markdown/removeMarkdownFormatting';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { Command } from './types/Command';

/**
 * Parses one line of ul/ol to command
 *
 * @returns parsed command object
 * @throws {SyntaxError} if the command is invalid
 *
 * @private within the pipelineStringToJson
 */
export function parseCommand(raw: string_markdown_text): Command {
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
        .split(' ')
        .map((part) => part.trim())
        .filter((item) => item !== '')
        .filter((item) => !/^PTBK$/i.test(item))
        .filter((item) => !/^PIPELINE$/i.test(item))
        .filter((item) => !/^PROMPTBOOK$/i.test(item))
        .map(removeMarkdownFormatting);

    const [commandName, ...args] = items;

    const getSupportedCommandsMessage = () =>
        COMMANDS.map(({ name, aliases, description }) =>
            spaceTrim(
                `
                    - **${name}**${aliases ? ` *(${aliases.join(', ')})*` : ''} ${description}
                `,
            ),
        ).join('\n');

    if (commandName === undefined) {
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

    for (const commandParser of COMMANDS) {
        const { name, aliases, parse } = commandParser;
        const names = [name, ...(aliases || [])];
        if (names.includes(commandName)) {
            try {
                return parse({ raw, normalized, args });
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
