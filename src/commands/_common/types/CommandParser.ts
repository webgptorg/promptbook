import type { WritableDeep } from 'type-fest';
import type { PipelineJson } from '../../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../../types/PipelineJson/PromptTemplateJson';
import type {
    string_markdown_text,
    string_name,
    string_promptbook_documentation_url,
} from '../../../types/typeAliases';
import type { string_SCREAMING_CASE } from '../../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { CommandUsagePlace } from './CommandUsagePlaces';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';

/**
 * @@@
 */
export type CommandParser<TCommand extends { type: string_name & string_SCREAMING_CASE }> = {
    /**
     * @@@
     */
    readonly name: string_name & string_SCREAMING_CASE;

    /**
     * @@@
     */
    readonly aliasNames?: Array<string_name & string_SCREAMING_CASE>;

    /**
     * @@@
     */
    readonly deprecatedNames?: Array<string_name & string_SCREAMING_CASE>;

    /**
     * @@@
     */
    readonly usagePlaces: Array<CommandUsagePlace>; // <- TODO: [😃]

    /**
     * @@@
     */
    readonly description: string_markdown_text;

    /**
     * @@@
     */
    readonly documentationUrl: string_promptbook_documentation_url;

    /**
     * @@@
     */
    readonly examples: Array<string_markdown_text>;

    /**
     * @throws {ParsingError} if the parsing fails
     */
    parse(input: CommandParserInput): TCommand;

    /**
     * Apply the command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: TCommand, pipelineJson: WritableDeep<PipelineJson>): void;

    /**
     * Apply the command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(
        command: TCommand,
        templateJson: WritableDeep<PipelineJson>,
        pipelineJson: WritableDeep<PipelineJson>,
    ): void;

    /**
     * Converts the command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: TCommand): string_markdown_text;

    /**
     * Reads the command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<TCommand>;

    /**
     * Reads the command from the `PromptTemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: PromptTemplateJson): Array<TCommand>;
};

/**
 * @@@
 */
export type CommandParserInput = {
    /**
     * @@@
     */
    readonly usagePlace: CommandUsagePlace;

    /**
     * @@@
     */
    readonly raw: string_markdown_text;

    /**
     * @@@
     */
    readonly rawArgs: string_markdown_text;

    /**
     * @@@
     */
    readonly normalized: string_name & string_SCREAMING_CASE;

    /**
     * @@@
     */
    readonly args: Array<string_name & string_SCREAMING_CASE>;
};

/**
 * TODO: [🍧][♓️] Add order here
 */
