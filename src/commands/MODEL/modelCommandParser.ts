import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { ModelRequirements } from '../../types/ModelRequirements';
import { MODEL_VARIANTS } from '../../types/ModelVariant';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type {
    $PipelineJson,
    $TaskJson,
    CommandParserInput,
    PipelineBothCommandParser,
} from '../_common/types/CommandParser';
import type { ModelCommand } from './ModelCommand';
import { $side_effect } from '../../utils/organization/$side_effect';

/**
 * Parses the model command
 *
 * @see `documentationUrl` for more details
 * @deprecated Option to manually set the model requirements is not recommended to use, use `PERSONA` instead
 * @public exported from `@promptbook/editable`
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
    isUsedInPipelineTask: true,

    /**
     * Description of the MODEL command
     */
    description: `Tells which \`modelRequirements\` (for example which model) to use for the prompt task execution`,

    /**
     * Link to documentation
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

        const availableVariantsMessage = spaceTrim(
            (block) => `
              Available variants are:
              ${block(
                  MODEL_VARIANTS.map(
                      (variantName) =>
                          `- ${variantName}${variantName !== 'EMBEDDING' ? '' : ' (Not available in pipeline)'}`,
                  ).join('\n'),
              )}
          `,
        );

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
                // <- Note: [🤖]
            } else if (normalized.startsWith('MODEL_VARIANT_EMBED')) {
                spaceTrim(
                    (block) => `
                        Embedding model can not be used in pipeline

                        ${block(availableVariantsMessage)}
                    `,
                );
            } else {
                throw new ParseError(
                    spaceTrim(
                        (block) => `
                            Unknown model variant in command:

                            ${block(availableVariantsMessage)}
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
    $applyToPipelineJson(command: ModelCommand, $pipelineJson: $PipelineJson): $side_effect {
        $pipelineJson.defaultModelRequirements = $pipelineJson.defaultModelRequirements || {};

        // TODO: [🚜] DRY
        if ($pipelineJson.defaultModelRequirements[command.key] !== undefined) {
            if ($pipelineJson.defaultModelRequirements[command.key] === command.value) {
                console.warn(`Multiple commands \`MODEL ${command.key} ${command.value}\` in the pipeline head`);
                // <- TODO: [🏮] Some better way how to get warnings from pipeline parsing / logic
                // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks
            } else {
                throw new ParseError(
                    spaceTrim(`
                        Redefinition of \`MODEL ${command.key}\` in the pipeline head

                        You have used:
                        1) \`MODEL ${command.key} ${$pipelineJson.defaultModelRequirements[command.key]}\`
                        2) \`MODEL ${command.key} ${command.value}\`
                    `),
                );
            }
        }

        $pipelineJson.defaultModelRequirements[command.key] = command.value;
    },

    /**
     * Apply the MODEL command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `taskJson`
     */
    $applyToTaskJson(command: ModelCommand, $taskJson: $TaskJson, $pipelineJson: $PipelineJson): $side_effect {
        if ($taskJson.taskType !== 'PROMPT_TASK') {
            throw new ParseError(`MODEL command can only be used in PROMPT_TASK block`);
        }

        $taskJson.modelRequirements = $taskJson.modelRequirements || {};

        // TODO: [🚜] DRY
        if ($taskJson.modelRequirements[command.key] !== undefined) {
            if ($taskJson.modelRequirements[command.key] === command.value) {
                console.warn(
                    `Multiple commands \`MODEL ${
                        (
                            {
                                modelName: 'NAME',
                                modelVariant: 'VARIANT',
                                maxTokens: '???',
                            } as Record<keyof ModelRequirements, string>
                        )[command.key]
                    } ${command.value}\` in the task "${$taskJson.title || $taskJson.name}"`,
                );
                // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks
            } else {
                throw new ParseError(
                    spaceTrim(`
                              Redefinition of MODEL \`${command.key}\` in the task "${
                        $taskJson.title || $taskJson.name
                    }"

                              You have used:
                              - MODEL ${command.key} ${$taskJson.modelRequirements[command.key]}
                              - MODEL ${command.key} ${command.value}
                          `),
                );
            }
        }

        if (command.value === ($pipelineJson.defaultModelRequirements || {})[command.key]) {
            console.log(
                spaceTrim(`
                    Setting MODEL \`${command.key}\` in the task "${
                    $taskJson.title || $taskJson.name
                }" to the same value as in the pipeline head

                    In pipeline head:
                    - MODEL ${command.key} ${($pipelineJson.defaultModelRequirements || {})[command.key]}

                    But same value is used in the task:
                    - MODEL ${command.key} ${command.value}
                `),
            );
        }

        $taskJson.modelRequirements[command.key] = command.value;
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
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<ModelCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },

    /**
     * Reads the MODEL command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<ModelCommand> {
        keepUnused($taskJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
