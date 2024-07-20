import spaceTrim from 'spacetrim';
import { MODEL_VARIANTS } from '../../types/ModelRequirements';
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
     * Description of the MODEL command
     */
    description: `Tells which model and modelRequirements to use for the prompt template execution`,

    /**
     * Example usages of the MODEL command
     */
    examples: ['MODEL VARIANT Chat', 'MODEL NAME `gpt-4`'],

    /**
     * Parses the MODEL command
     */
    parse(input: CommandParserInput): ModelCommand {
        const { args, normalized } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`MODEL command requires exactly one argument`);
        }

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
            } else {
                throw new SyntaxError(
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
            throw new SyntaxError(
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
