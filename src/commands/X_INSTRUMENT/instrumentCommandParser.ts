import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { $side_effect } from '../../utils/organization/$side_effect';
import { keepUnused } from '../../utils/organization/keepUnused';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { $PipelineJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineHeadCommandParser } from '../_common/types/CommandParser';
import type { InstrumentCommand } from './InstrumentCommand';

/**
 * Parses the instrument command
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
 */
export const instrumentCommandParser: PipelineHeadCommandParser<InstrumentCommand> = {
    /**
     * Name of the command
     */
    name: 'INSTRUMENT',

    /**
     * INSTRUMENT command can be used in:
     */
    isUsedInPipelineHead: true,
    isUsedInPipelineTask: false, // <- [👙] Maybe allow to use here and make relevant for just this task

    /**
     * Description of the INSTRUMENT command
     */
    description: `Instrument command is used to specify the instrument to be used in the pipeline or task like search, calculate, etc.`,

    /**
     * Link to documentation
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

        // TODO: [🛠] Implement
        TODO_USE(args);

        return {
            type: 'INSTRUMENT',
        } satisfies InstrumentCommand;
    },

    /**
     * Apply the INSTRUMENT command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: InstrumentCommand, $pipelineJson: $PipelineJson): $side_effect {
        keepUnused(command, $pipelineJson);
        console.error(new NotYetImplementedError('[🛠] Instruments are not implemented yet'));
    },

    /**
     * Converts the INSTRUMENT command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: InstrumentCommand): string_markdown_text {
        keepUnused(command);
        throw new NotYetImplementedError('[🛠] Instruments are not implemented yet');
    },

    /**
     * Reads the INSTRUMENT command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<InstrumentCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError('[🛠] Instruments are not implemented yet');
    },
};

/**
 * Note: [⛱] There are two types of INSTRUMENT commands *...(read more in [⛱])*
 */
