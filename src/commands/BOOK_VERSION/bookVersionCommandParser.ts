import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { isValidPromptbookVersion } from '../../utils/validators/semanticVersion/isValidPromptbookVersion';
import { BOOK_LANGUAGE_VERSION } from '../../version';
import type { $PipelineJson, CommandParserInput, PipelineHeadCommandParser } from '../_common/types/CommandParser';
import type { BookVersionCommand } from './BookVersionCommand';

/**
 * Parses the BOOK_VERSION command
 *
 * @see `documentationUrl` for more details
 * @private within the commands folder
 */
export const bookVersionCommandParser: PipelineHeadCommandParser<BookVersionCommand> = {
    /**
     * Name of the command
     */
    name: 'BOOK_VERSION',

    aliasNames: ['PTBK_VERSION', 'BOOK_VERSION', 'BOOK'],

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: true,
    isUsedInPipelineTemplate: false,

    /**
     * Description of the BOOK_VERSION command
     */
    description: `Which version of the Book language is the .ptbk.md using`,

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/69',

    /**
     * Example usages of the BOOK_VERSION command
     */
    examples: [`BOOK VERSION ${BOOK_LANGUAGE_VERSION}`, `BOOK ${BOOK_LANGUAGE_VERSION}`],

    /**
     * Parses the BOOK_VERSION command
     */
    parse(input: CommandParserInput): BookVersionCommand {
        const { args } = input;

        const promptbookVersion = args.pop();

        if (promptbookVersion === undefined) {
            throw new ParseError(`Version is required`);
        }

        if (!isValidPromptbookVersion(promptbookVersion)) {
            throw new ParseError(`Invalid Promptbook version "${promptbookVersion}"`);
        }

        if (args.length > 0) {
            throw new ParseError(`Can not have more than one Promptbook version`);
        }

        return {
            type: 'BOOK_VERSION',
            promptbookVersion,
        } satisfies BookVersionCommand;
    },

    /**
     * Apply the BOOK_VERSION command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: BookVersionCommand, $pipelineJson: $PipelineJson): void {
        // TODO: Warn if the version is overridden
        $pipelineJson.promptbookVersion = command.promptbookVersion;
    },

    /**
     * Converts the BOOK_VERSION command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: BookVersionCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the BOOK_VERSION command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<BookVersionCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
