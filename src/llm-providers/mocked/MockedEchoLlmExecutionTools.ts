import { spaceTrim } from 'spacetrim';
import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { AvailableModel, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CompletionPromptResult } from '../../execution/PromptResult';
import { addUsage } from '../../execution/utils/addUsage';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import { getCurrentIsoDate } from '../../utils/getCurrentIsoDate';
import { replaceParameters } from '../../utils/replaceParameters';

/**
 * Mocked execution Tools for just echoing the requests for testing purposes.
 */
export class MockedEchoLlmExecutionTools implements LlmExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions = {}) {}

    public get title(): string_title & string_markdown_text {
        return 'Mocked echo';
    }

    public get description(): string_markdown {
        return 'What you say is whay you get - just for testing';
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

        return {
            content: spaceTrim(
                (block) => `
                    You said:
                    ${block(replaceParameters(prompt.content, { ...prompt.parameters, modelName }))}
                `,
            ),
            modelName,
            timing: {
                start: getCurrentIsoDate(),
                complete: getCurrentIsoDate(),
            },
            usage: addUsage(/* <- TODO: [🧠] Compute here at least words, characters,... etc */),
            rawResponse: {
                note: 'This is mocked echo',
            },
            // <- [🗯]
        };
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

        return {
            content: spaceTrim(
                (block) => `
                    ${block(replaceParameters(prompt.content, { ...prompt.parameters, modelName }))}
                    And so on...
                `,
            ),
            modelName,
            timing: {
                start: getCurrentIsoDate(),
                complete: getCurrentIsoDate(),
            },
            usage: addUsage(/* <- TODO: [🧠] Compute here at least words, characters,... etc */),
            rawResponse: {
                note: 'This is mocked echo',
            },
            // <- [🗯]
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
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: Allow in spaceTrim: nesting with > ${block(prompt.request)}, same as replace params
 */
