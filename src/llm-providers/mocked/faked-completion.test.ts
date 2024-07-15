import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor';
import { CallbackInterfaceTools } from '../../knowledge/dialogs/callback/CallbackInterfaceTools';
import type { PipelineString } from '../../types/PipelineString';
import { PROMPTBOOK_VERSION } from '../../version';
import { MockedFackedLlmExecutionTools } from './MockedFackedLlmExecutionTools';

describe('createPipelineExecutor + MockedFackedLlmExecutionTools with sample completion prompt', () => {
    it('should work when every INPUT PARAMETER defined', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        expect(pipelineExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            outputParameters: {
                response: /.*/,
            },
        });
    });

    it('should fail when some INPUT PARAMETER is missing', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        expect(pipelineExecutor({}, () => {})).resolves.toEqual({
            isSuccessful: false,
            errors: [new Error(`Parameter {thing} is not defined`)],
            executionReport: {
                title: 'Sample prompt',
                description: 'Show how to use a simple completion prompt',
                promptExecutions: [],
                pipelineUrl: 'https://example.com/promptbook.json',
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
});

async function getPipelineExecutor() {
    const pipeline = await pipelineStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use a simple completion prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PIPELINE URL https://example.com/promptbook.json
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
    );
    const pipelineExecutor = createPipelineExecutor({
        pipeline,
        tools: {
            llm: new MockedFackedLlmExecutionTools({ isVerbose: true }),
            script: [],
            userInterface: new CallbackInterfaceTools({
                isVerbose: true,
                async callback() {
                    return 'Hello';
                },
            }),
        },
        settings: {
            maxExecutionAttempts: 3,
        },
    });
    return pipelineExecutor;
}
