import type { SetOptional, WritableDeep } from 'type-fest';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../../pipeline/PipelineJson/TaskJson';
import type {
    string_markdown_text,
    string_name,
    string_promptbook_documentation_url,
} from '../../../types/typeAliases';
import type { string_SCREAMING_CASE } from '../../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { $side_effect } from '../../../utils/organization/$side_effect';
import type { ___and___ } from '../../../utils/organization/___and___';
import type { CommandUsagePlace } from './CommandUsagePlaces';

/**
 * Base type for all command objects.
 * Requires a `type` property which is a SCREAMING_CASE string.
 *
 * @private just abstract helper for command parsers
 */
export type CommandBase = { type: string_name & string_SCREAMING_CASE };

/**
 * Represents a parser for a specific command used within a Promptbook pipeline.
 * It can parse commands used in the pipeline head, tasks, or both.
 *
 * @public exported from `@promptbook/editable`
 */
export type CommandParser<TCommand extends CommandBase> =
    | PipelineHeadCommandParser<TCommand>
    | PipelineTaskCommandParser<TCommand>
    | PipelineBothCommandParser<TCommand>;

/**
 * Common properties shared by all command parsers.
 *
 * @private just abstract the common properties of the command parsers
 */
export type CommonCommandParser<TCommand extends CommandBase> = {
    /**
     * The unique SCREAMING_CASE name of the command (e.g., 'MODEL', 'PARAMETER').
     */
    readonly name: string_name & string_SCREAMING_CASE;

    /**
     * Indicates if the command can be used in the pipeline's head section.
     */
    readonly isUsedInPipelineHead: boolean;

    /**
     * Indicates if the command can be used within a pipeline task.
     */
    readonly isUsedInPipelineTask: boolean;

    /**
     * Optional alternative names (aliases) for the command, also in SCREAMING_CASE.
     */
    readonly aliasNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;
    // <- TODO: [🧘] Make it non-optional

    /**
     * Optional list of deprecated names for the command, used for backward compatibility.
     */
    readonly deprecatedNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;
    // <- TODO: [🧘] Make it non-optional

    /**
     * A brief description of the command's purpose, supporting simple Markdown.
     */
    readonly description: string_markdown_text;

    /**
     * A URL pointing to the command's documentation.
     */
    readonly documentationUrl: string_promptbook_documentation_url;

    /**
     * Examples demonstrating the usage of the command in Markdown format.
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
 * Represents a command parser that can be used in both the pipeline head and tasks.
 *
 * @public exported from `@promptbook/editable`
 */
export type PipelineBothCommandParser<TCommand extends CommandBase> = ___and___ &
    Omit<PipelineHeadCommandParser<TCommand>, 'isUsedInPipelineTask'> &
    Omit<PipelineTaskCommandParser<TCommand>, 'isUsedInPipelineHead'>;

/**
 * Represents a command parser specifically for the pipeline head section.
 *
 * @public exported from `@promptbook/editable`
 */
export type PipelineHeadCommandParser<TCommand extends CommandBase> = CommonCommandParser<TCommand> & {
    /**
     * Always true for pipeline head commands.
     */
    readonly isUsedInPipelineHead: true;

    /**
     * Always false for pipeline head commands.
     */
    readonly isUsedInPipelineTask: false;

    /**
     * Apply the command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: TCommand, $pipelineJson: $PipelineJson): $side_effect;

    /**
     * Reads the command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     * @deprecated TODO: [🥍][🧠] Backup original files in `PipelineJson` same as in Promptbook.studio
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<TCommand>;
};

/**
 * Represents a command parser specifically for pipeline tasks.
 *
 * @public exported from `@promptbook/editable`
 */
export type PipelineTaskCommandParser<TCommand extends CommandBase> = CommonCommandParser<TCommand> & {
    /**
     * Always false for pipeline task commands.
     */
    readonly isUsedInPipelineHead: false;

    /**
     * Always true for pipeline task commands.
     */
    readonly isUsedInPipelineTask: true;

    /**
     * Apply the command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `taskJson` and/or `pipelineJson`
     */
    $applyToTaskJson(command: TCommand, $taskJson: $TaskJson, $pipelineJson: $PipelineJson): $side_effect;

    /**
     * Reads the command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<TCommand>;
};

/**
 * Represents a mutable TaskJson object, used internally by command parsers during application.
 *
 * Note: `$` prefix indicates the object is intended for mutation.
 *
 * @private internal helper for command parsers
 */
export type $TaskJson = {
    /**
     * Flag indicating if the section type (e.g., `SIMPLE_TEMPLATE`) has been set for this task.
     */
    isSectionTypeSet: boolean;
    /**
     * Flag indicating if this object represents a task (as opposed to other sections like parameters).
     */
    isTask: boolean;
} & Partial<WritableDeep<TaskJson>>;
//                         <- TODO: [🧠] `Partial<WritableDeep<...` vs `WritableDeep<Partial<...` - change ACRY

/**
 * Represents a mutable PipelineJson object, used internally by command parsers during application.
 *
 * Note: `$` prefix indicates the object is intended for mutation.
 *
 * @private internal helper for command parsers
 */
export type $PipelineJson = WritableDeep<SetOptional<PipelineJson, 'formfactorName'>>;

/**
 * Input object provided to the `parse` method of a CommandParser.
 */
export type CommandParserInput = {
    /**
     * Specifies where the command is being used (pipeline head or task).
     *
     * @example 'PIPELINE_HEAD'
     * @example 'PIPELINE_TASK'
     */
    readonly usagePlace: CommandUsagePlace;

    /**
     * The raw, unprocessed line containing the command and its arguments.
     *
     * @example 'promptbook version 0.62.0'
     * @example 'FOREACH Text Line `{customers}` -> `{customer}`'
     */
    readonly raw: string_markdown_text;

    /**
     * The arguments part of the raw command line, after the command name.
     *
     * @example '0.62.0'
     * @example 'List Line `{customers}` -> `{customer}`'
     */
    readonly rawArgs: string_markdown_text;

    /**
     * The normalized, SCREAMING_CASE representation of the command and its core arguments.
     *
     * @example 'PROMPTBOOK_ENGINE_VERSION_0_62_0'
     * @example 'FOREACH_LIST_LINE_CUSTOMERS_CUSTOMER'
     */
    readonly normalized: string_name & string_SCREAMING_CASE;

    /**
     * An array of arguments extracted from the line where the command is used.
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
