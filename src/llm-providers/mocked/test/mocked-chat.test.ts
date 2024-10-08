import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../../conversion/pipelineStringToJson';
import { CallbackInterfaceTools } from '../../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { PipelineString } from '../../../types/PipelineString';
import { PROMPTBOOK_VERSION } from '../../../version';
import { MockedEchoLlmExecutionTools } from '../MockedEchoLlmExecutionTools';

describe('createPipelineExecutor + MockedEchoLlmExecutionTools with sample chat prompt', () => {
    it('should work when every INPUT PARAMETER defined', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        expect(pipelineExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            executionReport: {
                title: 'Sample prompt',
                promptbookRequestedVersion: '1.0.0',
                pipelineUrl: 'https://promptbook.studio/samples/pipeline.ptbk.md',
                promptbookUsedVersion: PROMPTBOOK_VERSION,
            },
            outputParameters: {
                response: spaceTrim(`
                    You said:
                    One day I went to the shop and bought a cup of coffee.
                    Now I have a cup of coffee.
                `),
            },
        });
    });

    it('should fail when some INPUT PARAMETER is missing', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        expect(pipelineExecutor({}, () => {})).resolves.toMatchObject({
            isSuccessful: false,
            errors: [/Parameter {thing} is required as an input parameter/i],
            executionReport: {
                title: 'Sample prompt',
                description: 'Show how to use a simple chat prompt',
                promptExecutions: [],
                pipelineUrl: 'https://promptbook.studio/samples/pipeline.ptbk.md',
                promptbookRequestedVersion: '1.0.0',
                promptbookUsedVersion: PROMPTBOOK_VERSION,
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
        expect(pipelineExecutor({ thing: 'a cup of coffee', sound: 'Meow!' }, () => {})).rejects.toThrowError(/Parameter \{sound\} should not be defined/i);
    });
    */
});

async function getPipelineExecutor() {
    const pipeline = await pipelineStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use a simple chat prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PIPELINE URL https://promptbook.studio/samples/pipeline.ptbk.md
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
    );
    const pipelineExecutor = createPipelineExecutor({
        pipeline,
        tools: {
            llm: new MockedEchoLlmExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                { isVerbose: true },
            ),
            script: [],
            userInterface: new CallbackInterfaceTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    isVerbose: true,
                    async callback() {
                        return 'Hello';
                    },
                },
            ),
        },
    });
    return pipelineExecutor;
}

/**
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPipelineExecutor.test.ts"
 * Note: [🤖] For each new model variant consider adding new testing unit like "faked-completion.test.ts", "mocked-chat.test.ts" and "mocked-completion.test.ts"
 */
