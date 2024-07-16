import { spaceTrim } from 'spacetrim';
import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { AvailableModel, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PromptChatResult, PromptCompletionResult } from '../../execution/PromptResult';
import { addUsage } from '../../execution/utils/addUsage';
import type { Prompt } from '../../types/Prompt';
import { getCurrentIsoDate } from '../../utils/getCurrentIsoDate';

/**
 * Mocked execution Tools for just echoing the requests for testing purposes.
 */
export class MockedEchoLlmExecutionTools implements LlmExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions = {}) {}

    /**
     * Mocks chat model
     */
    public async callChatModel(prompt: Pick<Prompt, 'content' | 'modelRequirements'>): Promise<PromptChatResult> {
        if (this.options.isVerbose) {
            console.info('💬 Mocked callChatModel call');
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
            usage: addUsage(/* <- TODO: [🧠] Compute here at least words, characters,... etc */),
            rawResponse: {
                note: 'This is mocked echo',
            },
            // <- [🤹‍♂️]
        };
    }

    /**
     * Mocks completion model
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'modelRequirements'>,
    ): Promise<PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info('🖋 Mocked callCompletionModel call');
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
            usage: addUsage(/* <- TODO: [🧠] Compute here at least words, characters,... etc */),
            rawResponse: {
                note: 'This is mocked echo',
            },
            // <- [🤹‍♂️]
        };
    }

    // <- Note: [🤖] callXxxModel

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
            // <- Note: [🤖]
        ];
    }
}

/**
 * TODO: [🕵️‍♀️] Maybe just remove
 * TODO: Allow in spaceTrim: nesting with > ${block(prompt.request)}, same as replace params
 */
