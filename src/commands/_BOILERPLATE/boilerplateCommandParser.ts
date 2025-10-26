import { ParseError } from '../../errors/ParseError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { $side_effect } from '../../utils/organization/$side_effect';
import { keepUnused } from '../../utils/organization/keepUnused';
import type {
    $PipelineJson,
    $TaskJson,
    CommandParserInput,
    PipelineBothCommandParser,
} from '../_common/types/CommandParser';
import type { BoilerplateCommand } from './BoilerplateCommand';

/**
 * Parses the boilerplate command
 *
 * Note: @@ This command is used as boilerplate for new commands - it should NOT be used in any `.book` file
 *
 * @see `documentationUrl` for more details
 * @private within the commands folder
 */
export const boilerplateCommandParser: PipelineBothCommandParser<BoilerplateCommand> = {
    /**
     * Name of the command
     */
    name: 'BOILERPLATE',

    /**
     * Aliases for the BOILERPLATE command
     */
    aliasNames: ['BP'],

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: true,
    isUsedInPipelineTask: true,

    /**
     * Description of the BOILERPLATE command
     */
    description: `@@`,

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    /**
     * Example usages of the BOILERPLATE command
     */
    examples: ['BOILERPLATE foo', 'BOILERPLATE bar', 'BP foo', 'BP bar'],

    /**
     * Parses the BOILERPLATE command
     */
    parse(input: CommandParserInput): BoilerplateCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new ParseError(`BOILERPLATE command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new ParseError(`BOILERPLATE value can not contain brr`);
        }

        return {
            type: 'BOILERPLATE',
            value,
        } satisfies BoilerplateCommand;
    },

    /**
     * Apply the BOILERPLATE command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: BoilerplateCommand, $pipelineJson: $PipelineJson): $side_effect {
        keepUnused(command, $pipelineJson);
        throw new ParseError(
            `BOILERPLATE command is only for testing purposes and should not be used in the .book.md file`,
        );
    },

    /**
     * Apply the BOILERPLATE command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `taskJson`
     */
    $applyToTaskJson(command: BoilerplateCommand, $taskJson: $TaskJson, $pipelineJson: $PipelineJson): $side_effect {
        keepUnused(command, $taskJson, $pipelineJson);
        throw new ParseError(
            `BOILERPLATE command is only for testing purposes and should not be used in the .book.md file`,
        );
    },

    /**
     * Converts the BOILERPLATE command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: BoilerplateCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the BOILERPLATE command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<BoilerplateCommand> {
        keepUnused(pipelineJson);
        throw new ParseError(
            `BOILERPLATE command is only for testing purposes and should not be used in the .book.md file`,
        );
    },

    /**
     * Reads the BOILERPLATE command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<BoilerplateCommand> {
        keepUnused($taskJson);
        throw new ParseError(
            `BOILERPLATE command is only for testing purposes and should not be used in the .book.md file`,
        );
    },
};
