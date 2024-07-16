import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import { EmbeddingVector } from '../../execution/EmbeddingVector';
import type { AvailableModel, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PromptChatResult, PromptCompletionResult, PromptEmbeddingResult } from '../../execution/PromptResult';
import { addUsage } from '../../execution/utils/addUsage';
import type { Prompt } from '../../types/Prompt';
import { getCurrentIsoDate } from '../../utils/getCurrentIsoDate';
import { just } from '../../utils/just';
import { $fakeTextToExpectations } from './fakeTextToExpectations';

/**
 * Mocked execution Tools for just faking expected responses for testing purposes
 */
export class MockedFackedLlmExecutionTools implements LlmExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions = {}) {}

    /**
     * Fakes chat model
     */
    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'modelRequirements' | 'expectations' | 'postprocessing'>,
    ): Promise<PromptChatResult & PromptCompletionResult> {
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
            modelName: 'mocked-facked',
            timing: {
                start: getCurrentIsoDate(),
                complete: getCurrentIsoDate(),
            },
            usage: addUsage(/* <- TODO: [🧠] Compute here at least words, characters,... etc */),
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
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'modelRequirements' | 'expectations' | 'postprocessing'>,
    ): Promise<PromptCompletionResult> {
        return this.callChatModel(prompt);
    }

    /**
     * Fakes embedding model
     */
    public async callEmbeddingModel(
        prompt: Pick<Prompt, 'content' | 'modelRequirements' | 'expectations' | 'postprocessing'>,
    ): Promise<PromptEmbeddingResult> {
        just(prompt);

        const content = new Array(25).fill(0).map(() => Math.random() * 2 - 1) satisfies EmbeddingVector;

        const result = {
            content,
            modelName: 'mocked-facked',
            timing: {
                start: getCurrentIsoDate(),
                complete: getCurrentIsoDate(),
            },
            usage: addUsage(/* <- TODO: [🧠] Compute here at least words, characters,... etc */),
            rawResponse: {
                note: 'This is mocked embedding',
            },
            // <- [🤹‍♂️]
        } satisfies PromptEmbeddingResult;

        if (this.options.isVerbose) {
            console.info('💬 Mocked faked result', result);
        }

        return result;
    }

    // <- Note: [🤖] callXxxModel

    /**
     * List all available fake-models that can be used
     */
    public listModels(): Array<AvailableModel> {
        return [
            {
                modelTitle: 'Fake chat',
                modelName: 'mocked-echo',
                modelVariant: 'CHAT',
            },
            {
                modelTitle: 'Fake completion',
                modelName: 'mocked-echo',
                modelVariant: 'COMPLETION',
            },
            // <- Note: [🤖]
        ];
    }
}

/**
 * TODO: [🕵️‍♀️] Maybe just remove
 */
