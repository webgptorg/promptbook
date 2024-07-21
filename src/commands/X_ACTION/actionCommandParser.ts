import { just } from '../../utils/just';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { ActionCommand } from './ActionCommand';

/**
 * Parses the action command
 *
 * @see ./ACTION-README.md for more details
 * @private within the commands folder
 */
export const actionCommandParser: CommandParser<ActionCommand> = {
    /**
     * Name of the command
     */
    name: 'ACTION',

    /**
     * ACTION command can be used in:
     */
    usagePlaces: ['PIPELINE_HEAD', 'PIPELINE_TEMPLATE'],

    /**
     * Description of the ACTION command
     */
    description: `Actions influences from the pipeline or template into external world. Like turning on a light, sending an email, etc.`,

    /**
     * Link to discussion
     */
    discussionUrl: 'https://github.com/webgptorg/promptbook/discussions/72',

    /**
     * Example usages of the ACTION command
     */
    examples: ['ACTION'],

    /**
     * Parses the ACTION command
     */
    parse(input: CommandParserInput): ActionCommand {
        const { args } = input;

        just(args);

        return {
            type: 'ACTION',
        } satisfies ActionCommand;
    },
};
