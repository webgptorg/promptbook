import type { WritableDeep } from 'type-fest';
import type { PipelineJson } from '../../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../../types/PipelineJson/TemplateJson';
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
 */
export type CommandParser<TCommand extends CommandBase> =
    | PipelineHeadCommandParser<TCommand>
    | PipelineTemplateCommandParser<TCommand>
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
    readonly isUsedInPipelineTemplate: boolean;

    /**
     * @@@
     */
    readonly aliasNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;

    /**
     * @@@
     */
    readonly deprecatedNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;

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
     */
    stringify(command: TCommand): string_markdown_text;
};

/**
 * @@@
 */
export type PipelineBothCommandParser<TCommand extends CommandBase> = ___and___ &
    Omit<PipelineHeadCommandParser<TCommand>, 'isUsedInPipelineTemplate'> &
    Omit<PipelineTemplateCommandParser<TCommand>, 'isUsedInPipelineHead'>;

/**
 * @@@
 */
export type PipelineHeadCommandParser<TCommand extends CommandBase> = CommonCommandParser<TCommand> & {
    /**
     * @@@
     */
    readonly isUsedInPipelineHead: true;

    /**
     * @@@
     */
    readonly isUsedInPipelineTemplate: false;

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
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<TCommand>;
};

/**
 * @@@
 *
 * TODO: !!!!!! Rename to PipelineTaskCommandParser, applyToTaskJson, TaskJson, isUsedInPipelineTask,...
 */
export type PipelineTemplateCommandParser<TCommand extends CommandBase> = CommonCommandParser<TCommand> & {
    /**
     * @@@
     */
    readonly isUsedInPipelineHead: false;

    /**
     * @@@
     */
    readonly isUsedInPipelineTemplate: true;

    /**
     * Apply the command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson` and/or `pipelineJson`
     */
    $applyToTemplateJson(command: TCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void;

    /**
     * Reads the command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): ReadonlyArray<TCommand>;
};

/**
 * @@@
 *
 * Note: `$` is used to indicate that purpose of this type is to mutate the given object
 *
 * @private internal helper for command parsers
 */
export type $TemplateJson = {
    isTemplateTypeSet: boolean;
    isTemplate: boolean;
} & Partial<WritableDeep<TemplateJson>>;
//                         <- TODO: [🧠] `Partial<WritableDeep<...` vs `WritableDeep<Partial<...` - change ACRY

/**
 * @@@
 *
 *  Note: `$` is used to indicate that purpose of this type is to mutate the given object
 *
 * @private internal helper for command parsers
 */
export type $PipelineJson = WritableDeep<PipelineJson>;

/**
 * @@@
 */
export type CommandParserInput = {
    /**
     * @@@
     *
     * @example 'PIPELINE_HEAD'
     * @example 'PIPELINE_TEMPLATE'
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
 */
