import { spaceTrim } from 'spacetrim';
import type { Prompt } from '../../../../types/Prompt';
import { getCurrentIsoDate } from '../../../../utils/getCurrentIsoDate';
import type { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';
import type { AvailableModel, LlmExecutionTools } from '../../../LlmExecutionTools';
import type { PromptChatResult, PromptCompletionResult } from '../../../PromptResult';

/**
 * Mocked execution Tools for just echoing the requests for testing purposes.
 */
export class MockedEchoLlmExecutionTools implements LlmExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions) {}

    /**
     * Mocks chat model
     */
    public async gptChat(prompt: Pick<Prompt, 'content' | 'modelRequirements'>): Promise<PromptChatResult> {
        if (this.options.isVerbose) {
            console.info('💬 Mocked gptChat call');
        }
        return {
            content: spaceTrim(
                (block) => `
                    You said:
                    ${block(prompt.content)}
                `,
            ),
            modelName: 'mocked-echo',
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
        };
    }

    /**
     * Mocks completion model
     */
    public async gptComplete(prompt: Pick<Prompt, 'content' | 'modelRequirements'>): Promise<PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info('🖋 Mocked gptComplete call');
        }
        return {
            content: spaceTrim(
                (block) => `
                    ${block(prompt.content)}
                    And so on...
                `,
            ),
            modelName: 'mocked-echo',
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
        };
    }

    /**
     * List all available mocked-models that can be used
     */
    public listModels(): Array<AvailableModel> {
        return [
            {
                modelTitle: 'Echo chat',
                modelName: 'mocked-echo',
                modelVariant: 'CHAT',
            },
            {
                modelTitle: 'Echo completion',
                modelName: 'mocked-echo',
                modelVariant: 'COMPLETION',
            },
        ];
    }
}

/**
 * TODO: Allow in spaceTrim: nesting with > ${block(prompt.request)}, same as replace params
 */
