import spaceTrim from 'spacetrim';
import { ParsingError } from '../../errors/ParsingError';
import { MODEL_VARIANTS } from '../../types/ModelVariant';
import type { CommandParser } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { ModelCommand } from './ModelCommand';

/**
 * Parses the model command
 *
 * @see ./MODEL-README.md for more details
 * @private within the commands folder
 */
export const modelCommandParser: CommandParser<ModelCommand> = {
    /**
     * Name of the command
     */
    name: 'MODEL',

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: [
        'PIPELINE_HEAD',
        //  <- TODO: [🧠][❔] Should there be possibility to set MODEL for entire pipeline?
        'PIPELINE_TEMPLATE',
    ],

    /**
     * Description of the MODEL command
     */
    description: `Tells which model and modelRequirements to use for the prompt template execution`,

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
                throw new ParsingError(
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
            throw new ParsingError(
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
};
