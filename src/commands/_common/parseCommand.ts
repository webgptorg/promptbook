import { spaceTrim } from 'spacetrim';
import { SyntaxError } from '../../errors/SyntaxError';
import type { string_markdown_text } from '../../types/typeAliases';
import { removeMarkdownFormatting } from '../../utils/markdown/removeMarkdownFormatting';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { Command } from './types/Command';
import { COMMANDS } from '..';

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

    const [command, ...args] = items;


    for(const commandParser of COMMANDS){
      
    }

    throw new SyntaxError(
        spaceTrim(
            `
                    Unknown command:

                    - ${raw}

                    Supported commands are:
                    - PIPELINE_URL <url>
                    - PROMPTBOOK_VERSION <version>
                    - EXECUTE PROMPT TEMPLATE
                    - EXECUTE SIMPLE TEMPLATE
                    -         SIMPLE TEMPLATE
                    - EXECUTE SCRIPT
                    - EXECUTE PROMPT_DIALOG'
                    -         PROMPT_DIALOG'
                    - MODEL NAME <name>
                    - MODEL VARIANT <"Chat"|"Completion">
                    - INPUT  PARAM {<name>} <description>
                    - OUTPUT PARAM {<name>} <description>
                    - POSTPROCESS \`{functionName}\`
                    - JOKER {<name>}
                    - EXPECT JSON
                    - EXPECT <"Exactly"|"Min"|"Max"> <number> <"Chars"|"Words"|"Sentences"|"Paragraphs"|"Pages">

                `,
        ), // <- [🥻] Insert here when making new command
    );
}

// !!!!! Go throung [🥻]
