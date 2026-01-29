import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { PipelineString } from '../../../pipeline/PipelineString';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../version';
import { MockedFackedLlmExecutionTools } from '../MockedFackedLlmExecutionTools';

describe('createPipelineExecutor + MockedFackedLlmExecutionTools with example completion prompt', () => {
    it('should work when every INPUT PARAMETER defined', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        await expect(
            pipelineExecutor({ thing: 'a cup of coffee' }).asPromise({ isCrashedOnError: true }),
        ).resolves.toMatchObject({
            outputParameters: {
                response: /.*/,
            },
        });
    });

    it('should fail when some INPUT PARAMETER is missing', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        await expect(pipelineExecutor({}).asPromise({ isCrashedOnError: false })).resolves.toMatchObject({
            isSuccessful: false,
            errors: [/Parameter `{thing}` is required as an input parameter/i],
            executionReport: {
                title: 'Example prompt',
                description: 'Show how to use a simple completion prompt',
                promptExecutions: [],
                pipelineUrl: 'https://promptbook.studio/examples/pipeline.book',
                promptbookRequestedVersion: '1.0.0',
                promptbookUsedVersion: PROMPTBOOK_ENGINE_VERSION,
            },
            outputParameters: {},
            usage: {
                input: {
                    charactersCount: {
                        value: 0,
                    },
                    linesCount: {
                        value: 0,
                    },
                    pagesCount: {
                        value: 0,
                    },
                    paragraphsCount: {
                        value: 0,
                    },
                    sentencesCount: {
                        value: 0,
                    },
                    tokensCount: {
                        value: 0,
                    },
                    wordsCount: {
                        value: 0,
                    },
                },
                output: {
                    charactersCount: {
                        value: 0,
                    },
                    linesCount: {
                        value: 0,
                    },
                    pagesCount: {
                        value: 0,
                    },
                    paragraphsCount: {
                        value: 0,
                    },
                    sentencesCount: {
                        value: 0,
                    },
                    tokensCount: {
                        value: 0,
                    },
                    wordsCount: {
                        value: 0,
                    },
                },
                price: {
                    value: 0,
                },
            },
        });
    });
});

async function getPipelineExecutor() {
    const pipeline = await compilePipeline(
        spaceTrim(`
            # Example prompt

            Show how to use a simple completion prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PIPELINE URL https://promptbook.studio/examples/pipeline.book
            -   INPUT  PARAMETER {thing} Any thing to buy
            -   OUTPUT PARAMETER {response}

            ## Prompt

            - MODEL VARIANT Completion
            - MODEL NAME \`gpt-3.5-turbo-instruct\`
            - EXPECT MIN 2 LINES
            - EXPECT MAX 5 LINES
            - EXPECT MIN 10 WORDS

            \`\`\`
            One day I went to the shop and bought {thing}.
            Now I have {thing}.
            \`\`\`

            -> {response}
       `) as PipelineString,
        // <- TODO: [📼] Use`book\`` string literal notation
    );
    const pipelineExecutor = createPipelineExecutor({
        pipeline,
        tools: {
            llm: new MockedFackedLlmExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                { isVerbose: true },
            ),
            script: [],
            userInterface: new CallbackInterfaceTools({
                isVerbose: true,
                async callback() {
                    return 'Hello';
                },
            }),
        },
    });
    return pipelineExecutor;
}
