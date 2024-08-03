import type { WritableDeep } from 'type-fest';
import type { PipelineJson } from '../../../types/PipelineJson/PipelineJson';
import type {
    string_markdown_text,
    string_name,
    string_promptbook_documentation_url,
} from '../../../types/typeAliases';
import type { string_SCREAMING_CASE } from '../../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { CommandUsagePlace } from './CommandUsagePlaces';

export type CommandParser<TCommand extends { type: string_name & string_SCREAMING_CASE }> = {
    readonly name: string_name & string_SCREAMING_CASE;

    readonly aliasNames?: Array<string_name & string_SCREAMING_CASE>;

    readonly deprecatedNames?: Array<string_name & string_SCREAMING_CASE>;

    readonly usagePlaces: Array<CommandUsagePlace>; // <- TODO: [😃]

    readonly description: string_markdown_text;

    readonly documentationUrl: string_promptbook_documentation_url;

    readonly examples: Array<string_markdown_text>;

    /**
     * @throws {ParsingError} if the parsing fails
     */
    parse(input: CommandParserInput): TCommand;

    applyToPipelineJson?(pipelineJson: WritableDeep<PipelineJson>, personaCommand: TCommand): void;
};

export type CommandParserInput = {
    readonly usagePlace: CommandUsagePlace;

    readonly raw: string_markdown_text;

    readonly rawArgs: string_markdown_text;

    readonly normalized: string_name & string_SCREAMING_CASE;

    readonly args: Array<string_name & string_SCREAMING_CASE>;
};

/**
 * TODO: @@@ Annotate all
 * TODO: [🧠] Maybe put flag if it is for whole `.ptbk.md` file of just one section
 * TODO: [🍧] CommandParser should have applyToPipelineJson method
 *       which will apply parsed command to the pipeline JSON
 *       it will be called from `pipelineStringToJsonSync`
 *       and replace hardcoded switch statement and [💐]
 *       and throw ParsingError
 *
 */
