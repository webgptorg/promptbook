import { spaceTrim } from 'spacetrim';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CompletionPromptResult } from '../../execution/PromptResult';
import { ZERO_USAGE } from '../../execution/utils/usage-constants';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import { getCurrentIsoDate } from '../../utils/getCurrentIsoDate';
import { replaceParameters } from '../../utils/parameters/replaceParameters';
import { $asDeeplyFrozenSerializableJson } from '../../utils/serialization/$asDeeplyFrozenSerializableJson';

/**
 * Mocked execution Tools for just echoing the requests for testing purposes.
 *
 * @public exported from `@promptbook/fake-llm`
 */
export class MockedEchoLlmExecutionTools implements LlmExecutionTools {
    public constructor(protected readonly options: CommonToolsOptions = {}) {}

    public get title(): string_title & string_markdown_text {
        return 'Mocked echo';
    }

    public get description(): string_markdown {
        return 'What you say is whay you get - just for testing';
    }

    /**
     * Does nothing, just to implement the interface
     */
    public checkConfiguration(): void {}

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

    /**
     * Mocks chat model
     */
    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info('💬 Mocked callChatModel call');
        }

        const modelName = 'mocked-echo';
        const rawPromptContent = replaceParameters(prompt.content, { ...prompt.parameters, modelName });

        const usage = ZERO_USAGE;
        //      <- TODO: [🧠] Compute here at least words, characters,... etc

        return $asDeeplyFrozenSerializableJson('MockedEchoLlmExecutionTools ChatPromptResult', {
            content: spaceTrim(
                (block) => `
                    You said:
                    ${block(rawPromptContent)}
                `,
            ),
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
        });
    }

    /**
     * Mocks completion model
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        if (this.options.isVerbose) {
            console.info('🖋 Mocked callCompletionModel call');
        }

        const modelName = 'mocked-echo';
        const rawPromptContent = replaceParameters(prompt.content, { ...prompt.parameters, modelName });

        const usage = ZERO_USAGE;
        //      <- TODO: [🧠] Compute here at least words, characters,... etc

        return $asDeeplyFrozenSerializableJson('MockedEchoLlmExecutionTools CompletionPromptResult', {
            content: spaceTrim(
                (block) => `
                    ${block(rawPromptContent)}
                    And so on...
                `,
            ),
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
        });
    }

    // <- Note: [🤖] callXxxModel
}

/**
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: Allow in spaceTrim: nesting with > ${block(prompt.request)}, same as replace params
 */
