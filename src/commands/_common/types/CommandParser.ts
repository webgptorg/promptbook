import { string_SCREAMING_CASE } from '../../../_packages/utils.index';
import { string_markdown_text, string_name } from '../../../types/typeAliases';

export type CommandParser<TCommand extends { type: string_name & string_SCREAMING_CASE }> = {
    /**
     * @throws {SyntaxError} if the parsing fails
     */
    parse(input: CommandParserInput): TCommand | null;
};

export type CommandParserInput = {
    raw: string_markdown_text;

    normalized: string_name & string_SCREAMING_CASE;

    items: Array<string_name & string_SCREAMING_CASE>;
};

/**
 * TODO: !!!! Annotate
 */
