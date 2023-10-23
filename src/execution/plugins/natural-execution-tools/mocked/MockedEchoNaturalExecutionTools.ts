import spaceTrim from 'spacetrim';
import { Prompt } from '../../../../types/Prompt';
import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';
import { NaturalExecutionTools } from '../../../NaturalExecutionTools';
import { PromptChatResult, PromptCompletionResult } from '../../../PromptResult';

/**
 * Mocked execution Tools for just echoing the requests for testing purposes.
 */
export class MockedEchoNaturalExecutionTools implements NaturalExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions) {}

    /**
     * Mocks chat model
     */
    public async gptChat(prompt: Prompt): Promise<PromptChatResult> {
        if (this.options.isVerbose) {
            console.info(`💬 Mocked gptChat call`);
        }
        return {
            content: spaceTrim(
                (block) => `
                    You said:
                    ${block(prompt.content)}
                `,
            ),
            model: `mocked-echo`,
            rawResponse: {
                note: `This is mocked echo`,
            },
            // <- [🤹‍♂️]
        };
    }

    /**
     * Mocks completion model
     */
    public async gptComplete(prompt: Prompt): Promise<PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info(`🖋 Mocked gptComplete call`);
        }
        return {
            content: spaceTrim(
                (block) => `
                    ${block(prompt.content)}
                    And so on...
                `,
            ),
            model: `mocked-echo`,
            rawResponse: {
                note: `This is mocked echo`,
            },
            // <- [🤹‍♂️]
        };
    }
}

/**
 * TODO: Allow in spaceTrim: nesting with > ${block(prompt.request)}
 */
