import type { SetOptional, WritableDeep } from 'type-fest';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../../pipeline/PipelineJson/TaskJson';
import type { string_markdown_text } from '../../../types/typeAliases';
import type { string_name } from '../../../types/typeAliases';
import type { string_promptbook_documentation_url } from '../../../types/typeAliases';
import type { string_SCREAMING_CASE } from '../../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { ___and___ } from '../../../utils/organization/___and___';
import type { CommandUsagePlace } from './CommandUsagePlaces';

/**
 * @@@
 *
 * @private just abstract helper for command parsers
 */
export type CommandBase = { type: string_name & string_SCREAMING_CASE };

/**
 * @@@
 *
 * @public exported from `@promptbook/editable`
 */
export type CommandParser<TCommand extends CommandBase> =
    | PipelineHeadCommandParser<TCommand>
    | PipelineTaskCommandParser<TCommand>
    | PipelineBothCommandParser<TCommand>;

/**
 * @@@
 *
 * @private just abstract the common properties of the command parsers
 */
export type CommonCommandParser<TCommand extends CommandBase> = {
    /**
     * @@@
     */
    readonly name: string_name & string_SCREAMING_CASE;

    /**
     * @@@
     */
    readonly isUsedInPipelineHead: boolean;

    /**
     * @@@
     */
    readonly isUsedInPipelineTask: boolean;

    /**
     * @@@
     */
    readonly aliasNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;
    // <- TODO: [🧘] Make it non-optional

    /**
     * @@@
     */
    readonly deprecatedNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;
    // <- TODO: [🧘] Make it non-optional

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
    readonly examples: ReadonlyArray<string_markdown_text>;

    /**
     * @throws {ParseError} if the parsing fails
     */
    parse(input: CommandParserInput): TCommand;

    /**
     * Converts the command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     * @deprecated TODO: [🥍][🧠] Backup original files in `PipelineJson` same as in Promptbook.studio
     */
    stringify(command: TCommand): string_markdown_text;
};

/**
 * @@@
 *
 * @public exported from `@promptbook/editable`
 */
export type PipelineBothCommandParser<TCommand extends CommandBase> = ___and___ &
    Omit<PipelineHeadCommandParser<TCommand>, 'isUsedInPipelineTask'> &
    Omit<PipelineTaskCommandParser<TCommand>, 'isUsedInPipelineHead'>;

/**
 * @@@
 *
 * @public exported from `@promptbook/editable`
 */
export type PipelineHeadCommandParser<TCommand extends CommandBase> = CommonCommandParser<TCommand> & {
    /**
     * @@@
     */
    readonly isUsedInPipelineHead: true;

    /**
     * @@@
     */
    readonly isUsedInPipelineTask: false;

    /**
     * Apply the command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: TCommand, $pipelineJson: $PipelineJson): void;

    /**
     * Reads the command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     * @deprecated TODO: [🥍][🧠] Backup original files in `PipelineJson` same as in Promptbook.studio
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<TCommand>;
};

/**
 * @@@
 *
 * @public exported from `@promptbook/editable`
 */
export type PipelineTaskCommandParser<TCommand extends CommandBase> = CommonCommandParser<TCommand> & {
    /**
     * @@@
     */
    readonly isUsedInPipelineHead: false;

    /**
     * @@@
     */
    readonly isUsedInPipelineTask: true;

    /**
     * Apply the command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `taskJson` and/or `pipelineJson`
     */
    $applyToTaskJson(command: TCommand, $taskJson: $TaskJson, $pipelineJson: $PipelineJson): void;

    /**
     * Reads the command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<TCommand>;
};

/**
 * @@@
 *
 * Note: `$` is used to indicate that purpose of this type is to mutate the given object
 *
 * @private internal helper for command parsers
 */
export type $TaskJson = {
    isSectionTypeSet: boolean;
    isTask: boolean;
} & Partial<WritableDeep<TaskJson>>;
//                         <- TODO: [🧠] `Partial<WritableDeep<...` vs `WritableDeep<Partial<...` - change ACRY

/**
 * @@@
 *
 *  Note: `$` is used to indicate that purpose of this type is to mutate the given object
 *
 * @private internal helper for command parsers
 */
export type $PipelineJson = WritableDeep<SetOptional<PipelineJson, 'formfactorName'>>;

/**
 * @@@
 */
export type CommandParserInput = {
    /**
     * @@@
     *
     * @example 'PIPELINE_HEAD'
     * @example 'PIPELINE_TASK'
     */
    readonly usagePlace: CommandUsagePlace;

    /**
     * @@@
     *
     * @example 'promptbook version 0.62.0'
     * @example 'FOREACH Text Line `{customers}` -> `{customer}`'
     */
    readonly raw: string_markdown_text;

    /**
     * @@@
     *
     * @example '0.62.0'
     * @example 'List Line `{customers}` -> `{customer}`'
     */
    readonly rawArgs: string_markdown_text;

    /**
     * @@@
     *
     * @example 'PROMPTBOOK_ENGINE_VERSION_0_62_0'
     * @example 'FOREACH_LIST_LINE_CUSTOMERS_CUSTOMER'
     */
    readonly normalized: string_name & string_SCREAMING_CASE;

    /**
     * @@@
     *
     * @example [ '0.62.0' ]
     * @example [ 'List', 'Line', '{customers}', '', '{customer}' ]
     */
    readonly args: Array<string_name>;
};

/**
 * TODO: [♓️] Add order here
 * TODO: [🧠][🍱] Maybe make some common abstraction between `HighLevelAbstraction` and `CommandParser`
 */
