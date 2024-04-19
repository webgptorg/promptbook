import { Prompt } from '../../../../types/Prompt';
import { getCurrentIsoDate } from '../../../../utils/getCurrentIsoDate';
import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';
import { NaturalExecutionTools } from '../../../NaturalExecutionTools';
import { PromptChatResult, PromptCompletionResult } from '../../../PromptResult';
import { $fakeTextToExpectations } from './fakeTextToExpectations';

/**
 * Mocked execution Tools for just faking expected responses for testing purposes
 */
export class MockedFackedNaturalExecutionTools implements NaturalExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions) {}

    /**
     * Fakes chat model
     */
    public async gptChat(prompt: Prompt): Promise<PromptChatResult & PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info('💬 Mocked faked prompt', prompt);
        }

        const content = await $fakeTextToExpectations(
            prompt.expectations || {
                sentences: { min: 1, max: 1 },
            },
            prompt.postprocessing,
        );

        const result = {
            content,
            model: 'mocked-facked',
            timing: {
                start: getCurrentIsoDate(),
                complete: getCurrentIsoDate(),
            },
            usage: {
                price: 0,
                inputTokens: 0,
                outputTokens: 0,
            },
            rawResponse: {
                note: 'This is mocked echo',
            },
            // <- [🤹‍♂️]
        } satisfies PromptChatResult & PromptCompletionResult;

        if (this.options.isVerbose) {
            console.info('💬 Mocked faked result', result);
        }

        return result;
    }

    /**
     * Fakes completion model
     */
    public async gptComplete(prompt: Prompt): Promise<PromptCompletionResult> {
        return this.gptChat(prompt);
    }
}
