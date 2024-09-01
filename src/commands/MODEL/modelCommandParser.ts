import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import { MODEL_VARIANTS } from '../../types/ModelVariant';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { $PipelineJson } from '../_common/types/CommandParser';
import type { $TemplateJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineBothCommandParser } from '../_common/types/CommandParser';
import type { ModelCommand } from './ModelCommand';

/**
 * Parses the model command
 *
 * @see ./MODEL-README.md for more details
 * @private within the commands folder
 */
export const modelCommandParser: PipelineBothCommandParser<ModelCommand> = {
    /**
     * Name of the command
     */
    name: 'MODEL',

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: true, //  <- TODO: [🧠][❔] Should there be possibility to set MODEL for entire pipeline?
    isUsedInPipelineTemplate: true,

    /**
     * Description of the MODEL command
     */
    description: `Tells which \`modelRequirements\` (for example which model) to use for the prompt template execution`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/67',

    /**
     * Example usages of the MODEL command
     */
    examples: ['MODEL VARIANT Chat', 'MODEL NAME `gpt-4`'],

    /**
     * Parses the MODEL command
     */
    parse(input: CommandParserInput): ModelCommand {
        const { args, normalized } = input;

        // TODO: Make this more elegant and dynamically
        if (normalized.startsWith('MODEL_VARIANT')) {
            if (normalized === 'MODEL_VARIANT_CHAT') {
                return {
                    type: 'MODEL',
                    key: 'modelVariant',
                    value: 'CHAT',
                } satisfies ModelCommand;
            } else if (normalized === 'MODEL_VARIANT_COMPLETION') {
                return {
                    type: 'MODEL',
                    key: 'modelVariant',
                    value: 'COMPLETION',
                } satisfies ModelCommand;
            } else if (normalized.startsWith('MODEL_VARIANT_EMBED')) {
                return {
                    type: 'MODEL',
                    key: 'modelVariant',
                    value: 'EMBEDDING',
                } satisfies ModelCommand;
                // <- Note: [🤖]
            } else {
                throw new ParseError(
                    spaceTrim(
                        (block) => `
                            Unknown model variant in command:

                            Supported variants are:
                            ${block(MODEL_VARIANTS.map((variantName) => `- ${variantName}`).join('\n'))}
                        `,
                    ),
                );
            }
        }
        if (normalized.startsWith('MODEL_NAME')) {
            return {
                type: 'MODEL',
                key: 'modelName',
                value: args.pop()!,
            } satisfies ModelCommand;
        } else {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                    Unknown model key in command.

                    Supported model keys are:
                    ${block(['variant', 'name'].join(', '))}

                    Example:
                    - MODEL VARIANT Chat
                    - MODEL NAME gpt-4
              `,
                ),
            );
        }
    },

    /**
     * Apply the MODEL command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: ModelCommand, $pipelineJson: $PipelineJson): void {
        // TODO: !!!!!! Error on redefine
        $pipelineJson.defaultModelRequirements = $pipelineJson.defaultModelRequirements || {};
        $pipelineJson.defaultModelRequirements[command.key] = command.value;
    },

    /**
     * Apply the MODEL command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(
        command: ModelCommand,
        $templateJson: $TemplateJson,
        // $pipelineJson: $PipelineJson,
    ): void {
        if ($templateJson.templateType !== 'PROMPT_TEMPLATE') {
            throw new ParseError(`MODEL command can only be used in PROMPT_TEMPLATE block`);
        }

        // TODO: !!!!!! Error on redefine
        // TODO: Warn if setting same as default in `$pipelineJson`

        $templateJson.modelRequirements = $templateJson.modelRequirements || {};
        $templateJson.modelRequirements[command.key] = command.value;
    },

    /**
     * Converts the MODEL command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ModelCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the MODEL command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<ModelCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },

    /**
     * Reads the MODEL command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): Array<ModelCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
