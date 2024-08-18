import type { AvailableModel } from '../../execution/AvailableModel';
import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { EmbeddingVector } from '../../execution/EmbeddingVector';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { CompletionPromptResult } from '../../execution/PromptResult';
import type { EmbeddingPromptResult } from '../../execution/PromptResult';
import { ZERO_USAGE } from '../../execution/utils/addUsage';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import { getCurrentIsoDate } from '../../utils/getCurrentIsoDate';
import { replaceParameters } from '../../utils/replaceParameters';
import { $fakeTextToExpectations } from './$fakeTextToExpectations';

/**
 * Mocked execution Tools for just faking expected responses for testing purposes
 *
 * @public exported from `@promptbook/fake-llm`
 */
export class MockedFackedLlmExecutionTools implements LlmExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions = {}) {}

    public get title(): string_title & string_markdown_text {
        return 'Mocked facked';
    }

    public get description(): string_markdown {
        return 'Use faked lorem ipsum data - just for testing';
    }

    /**
     * Does nothing, just to implement the interface
     */
    public checkConfiguration(): void {}

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

    /**
     * Fakes chat model
     */
    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'expectations' | 'postprocessing'>,
    ): Promise<ChatPromptResult & CompletionPromptResult> {
        if (this.options.isVerbose) {
            console.info('💬 Mocked faked prompt', prompt);
        }

        const modelName = 'mocked-facked';
        const rawPromptContent = replaceParameters(prompt.content, { ...prompt.parameters, modelName });

        const usage = ZERO_USAGE;
        //      <- TODO: [🧠] Compute here at least words, characters,... etc

        const content = await $fakeTextToExpectations(
            prompt.expectations || {
                sentences: { min: 1, max: 1 },
            },
            prompt.postprocessing,
        );

        const result = {
            content,
            modelName,
            timing: {
                start: getCurrentIsoDate(),
                complete: getCurrentIsoDate(),
            },
            usage,
            rawPromptContent,
            rawRequest: null,
            rawResponse: {
                note: 'This is mocked echo',
            },
            // <- [🗯]
        } satisfies ChatPromptResult & CompletionPromptResult;

        if (this.options.isVerbose) {
            console.info('💬 Mocked faked result', result);
        }

        return result;
    }

    /**
     * Fakes completion model
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'expectations' | 'postprocessing'>,
    ): Promise<CompletionPromptResult> {
        return this.callChatModel(prompt);
    }

    /**
     * Fakes embedding model
     */
    public async callEmbeddingModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'expectations' | 'postprocessing'>,
    ): Promise<EmbeddingPromptResult> {
        const modelName = 'mocked-facked';
        const rawPromptContent = replaceParameters(prompt.content, { ...prompt.parameters, modelName });
        const content = new Array(
            //            <- TODO: [🧱] Implement in a functional (not new Class) way
            1024,
        )
            .fill(0)
            .map(() => Math.random() * 2 - 1) satisfies EmbeddingVector; /* <- TODO: [🤛] */

        const usage = ZERO_USAGE;
        //      <- TODO: [🧠] Compute here at least words, characters,... etc

        // TODO: Make content vector exactly length of 1

        const result = {
            content,
            modelName,
            timing: {
                start: getCurrentIsoDate(),
                complete: getCurrentIsoDate(),
            },
            usage,
            rawPromptContent,
            rawRequest: null,
            rawResponse: {
                note: 'This is mocked embedding',
            },
            // <- [🗯]
        } satisfies EmbeddingPromptResult;

        if (this.options.isVerbose) {
            console.info('💬 Mocked faked result', result);
        }

        return result;
    }

    // <- Note: [🤖] callXxxModel
}

/**
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 */
