import spaceTrim from 'spacetrim';
import { UserInterfaceTools, UserInterfaceToolsPromptDialogOptions } from '../../../UserInterfaceTools';
import { CallbackInterfaceToolsOptions } from './CallbackInterfaceToolsOptions';

/**
 * Delagates the user interaction to a async callback function
 * You need to provide your own implementation of this callback function and its bind to UI.
 */
export class CallbackInterfaceTools implements UserInterfaceTools {
    public constructor(private readonly options: CallbackInterfaceToolsOptions) {}

    /**
     * Trigger the custom callback function
     */
    public async promptDialog(options: UserInterfaceToolsPromptDialogOptions): Promise<string> {
        const answer = await this.options.callback(options);

        if (this.options.isVerbose) {
            console.info(
                spaceTrim(
                    (block) => `
                        🌠 ${block(options.prompt)}
                        👤 ${block(answer)}   
                    `,
                ),
            );
        }

        return answer;
    }
}
