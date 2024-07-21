import type { string_markdown_text, string_name } from '../../../types/typeAliases';
import type { string_SCREAMING_CASE } from '../../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { CommandUsagePlace } from './CommandUsagePlaces';

export type CommandParser<TCommand extends { type: string_name & string_SCREAMING_CASE }> = {
    name: string_name & string_SCREAMING_CASE;

    aliasNames?: Array<string_name & string_SCREAMING_CASE>;

    deprecatedNames?: Array<string_name & string_SCREAMING_CASE>;

    usagePlaces: Array<CommandUsagePlace>; // <- TODO: [😃]

    description: string_markdown_text;

    discussionUrl: `https://github.com/webgptorg/promptbook/discussions/${number | '@@'}`;

    examples: Array<string_markdown_text>;

    /**
     * @throws {SyntaxError} if the parsing fails
     */
    parse(input: CommandParserInput): TCommand;
};

export type CommandParserInput = {
    usagePlace: CommandUsagePlace;

    raw: string_markdown_text;

    normalized: string_name & string_SCREAMING_CASE;

    args: Array<string_name & string_SCREAMING_CASE>;
};

/**
 * TODO: !!!! Annotate
 * TODO: [🧠] Maybe put flag if it is for whole `.ptbk.md` file of just one section
 */
