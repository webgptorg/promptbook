import { ParsingError } from '../../errors/ParsingError';
import { isValidPromptbookVersion } from '../../utils/validators/semanticVersion/isValidPromptbookVersion';
import { PROMPTBOOK_VERSION } from '../../version';
import type { CommandParser } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PromptbookVersionCommand } from './PromptbookVersionCommand';

/**
 * Parses the PROMPTBOOK_VERSION command
 *
 * @see ./PROMPTBOOK_VERSION-README.md for more details
 * @private within the commands folder
 */
export const promptbookVersionCommandParser: CommandParser<PromptbookVersionCommand> = {
    /**
     * Name of the command
     */
    name: 'PROMPTBOOK_VERSION',

    aliasNames: ['PTBK_VERSION', 'PTBK_V', 'PTBKV'],

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_HEAD'],

    /**
     * Description of the PROMPTBOOK_VERSION command
     */
    description: `Which version of the promptbook is the .ptbk.md using`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/69',

    /**
     * Example usages of the PROMPTBOOK_VERSION command
     */
    examples: [`PROMPTBOOK VERSION ${PROMPTBOOK_VERSION}`, `PTBKV ${PROMPTBOOK_VERSION}`],

    /**
     * Parses the PROMPTBOOK_VERSION command
     */
    parse(input: CommandParserInput): PromptbookVersionCommand {
        const { args } = input;

        const promptbookVersion = args.pop()!;

        if (promptbookVersion === undefined) {
            throw new ParsingError(`Version is required`);
        }

        if (!isValidPromptbookVersion(promptbookVersion)) {
            throw new ParsingError(`Invalid Promptbook version "${promptbookVersion}"`);
        }

        if (args.length > 0) {
            throw new ParsingError(`Can not have more than one Promptbook version`);
        }

        return {
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion,
        } satisfies PromptbookVersionCommand;
    },
};
