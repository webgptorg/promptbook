import { NotImplementedError } from '../../errors/NotImplementedError';
import { just } from '../../utils/just';
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
    discussionUrl: 'https://github.com/webgptorg/promptbook/discussions/71',

    /**
     * Example usages of the INSTRUMENT command
     */
    examples: ['INSTRUMENT foo', 'INSTRUMENT bar', 'BP foo', 'BP bar'],

    /**
     * Parses the INSTRUMENT command
     */
    parse(input: CommandParserInput): InstrumentCommand {
        const { args } = input;

        just(args);
        throw new NotImplementedError(`Instruments are not implemented yet`);

        /*
        return {
            type: 'INSTRUMENT',
            value,
        } satisfies InstrumentCommand;
        */
    },
};
