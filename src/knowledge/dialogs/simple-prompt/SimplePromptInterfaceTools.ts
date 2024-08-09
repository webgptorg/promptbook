import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../../../errors/PipelineExecutionError';
import type { CommonExecutionToolsOptions } from '../../../execution/CommonExecutionToolsOptions';
import type { UserInterfaceTools, UserInterfaceToolsPromptDialogOptions } from '../../../execution/UserInterfaceTools';

/**
 * Wrapper around `window.prompt` synchronous function that interacts with the user via browser prompt
 *
 * Warning: It is used for testing and mocking
 *          **NOT intended to use in the production** due to its synchronous nature.
 *
 * @public exported from `@promptbook/browser`
 */
export class SimplePromptInterfaceTools implements UserInterfaceTools {
    public constructor(private readonly options: CommonExecutionToolsOptions = {}) {}

    /**
     * Trigger window.PROMPT DIALOG
     */
    public async promptDialog(options: UserInterfaceToolsPromptDialogOptions): Promise<string> {
        const answer = window.prompt(
            spaceTrim(
                (block) => `
                    ${block(options.promptTitle)}

                    ${block(options.promptMessage)}
                `,
            ),
        );

        if (this.options.isVerbose) {
            console.info(
                spaceTrim(
                    (block) => `
                        📖 ${block(options.promptTitle)}
                        👤 ${block(answer || '🚫 User cancelled prompt')}
                    `,
                ),
            );
        }

        if (answer === null) {
            throw new PipelineExecutionError('User cancelled prompt');
        }

        return answer;
    }
}

/**
 * Note: [🔵] This code should never be published outside of `@promptbook/browser`
 */
