import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { PipelineString } from '../../../pipeline/PipelineString';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../version';
import { MockedEchoLlmExecutionTools } from '../MockedEchoLlmExecutionTools';

describe('createPipelineExecutor + MockedEchoLlmExecutionTools with example chat prompt', () => {
    it('should work when every INPUT PARAMETER defined', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        await expect(
            pipelineExecutor({ thing: 'a cup of coffee' }).asPromise({ isCrashedOnError: true }),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            executionReport: {
                title: 'Example prompt',
                promptbookRequestedVersion: '1.0.0',
                pipelineUrl: 'https://promptbook.studio/examples/pipeline.book',
                promptbookUsedVersion: PROMPTBOOK_ENGINE_VERSION,
            },
            outputParameters: {
                response: expect.stringContaining(
                    spaceTrim(`
                    You said:
                    „One day I went to the shop and bought a cup of coffee.
                    Now I have a cup of coffee.“
                `),
                ),
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
                description: 'Show how to use a simple chat prompt',
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

    /*
    TODO: [🧠] Should be this failing or not?
    it('should fail when there is INPUT  PARAMETER extra', () => {
        expect(pipelineExecutor({ thing: 'a cup of coffee', sound: 'Meow!' }).asPromise()).rejects.toThrowError(/Parameter \{sound\} should not be defined/i);
    });
    */
});

async function getPipelineExecutor() {
    const pipeline = await compilePipeline(
        spaceTrim(`
            # Example prompt

            Show how to use a simple chat prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PIPELINE URL https://promptbook.studio/examples/pipeline.book
            -   MODEL VARIANT Chat
            -   MODEL NAME gpt-3.5-turbo
            -   INPUT  PARAMETER {thing} Any thing to buy
            -   OUTPUT PARAMETER {response}

            ## Prompt

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
            llm: new MockedEchoLlmExecutionTools({ isVerbose: true }),
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

/**
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPipelineExecutor.test.ts"
 * Note: [🤖] For each new model variant consider adding new testing unit like "faked-completion.test.ts", "mocked-chat.test.ts" and "mocked-completion.test.ts"
 */
