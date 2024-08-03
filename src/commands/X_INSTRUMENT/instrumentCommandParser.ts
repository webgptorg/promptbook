import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { InstrumentCommand } from './InstrumentCommand';

/**
 * Parses the instrument command
 *
 * @see ./INSTRUMENT-README.md for more details
 * @private within the commands folder
 */
export const instrumentCommandParser: CommandParser<InstrumentCommand> = {
    /**
     * Name of the command
     */
    name: 'INSTRUMENT',

    /**
     * INSTRUMENT command can be used in:
     */
    usagePlaces: ['PIPELINE_HEAD', 'PIPELINE_TEMPLATE'],

    /**
     * Description of the INSTRUMENT command
     */
    description: `Instrument command is used to specify the instrument to be used in the pipeline or template like search, calculate, etc.`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/71',

    /**
     * Example usages of the INSTRUMENT command
     */
    examples: ['INSTRUMENT'],

    /**
     * Parses the INSTRUMENT command
     */
    parse(input: CommandParserInput): InstrumentCommand {
        const { args } = input;

        TODO_USE(args);

        return {
            type: 'INSTRUMENT',
        } satisfies InstrumentCommand;
    },
};
