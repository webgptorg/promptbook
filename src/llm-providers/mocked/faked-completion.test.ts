import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { promptbookStringToJson } from '../../conversion/promptbookStringToJson';
import { createPromptbookExecutor } from '../../execution/createPromptbookExecutor';
import { CallbackInterfaceTools } from '../../knowledgebase/dialogs/callback/CallbackInterfaceTools';
import type { PromptbookString } from '../../types/PromptbookString';
import { PROMPTBOOK_VERSION } from '../../version';
import { MockedFackedLlmExecutionTools } from './MockedFackedLlmExecutionTools';

describe('createPromptbookExecutor + MockedEchoExecutionTools with sample chat prompt', () => {
    const promptbook = promptbookStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use a simple completion prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PROMPTBOOK URL https://example.com/promptbook.json
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
         `) as PromptbookString,
    );
    const promptbookExecutor = createPromptbookExecutor({
        promptbook,
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

    it('should work when every INPUT PARAMETER defined', () => {
        expect(promptbookExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            outputParameters: {
                response: /.*/,
            },
        });
    });

    it('should fail when some INPUT PARAMETER is missing', () =>
        expect(promptbookExecutor({}, () => {})).resolves.toEqual({
            isSuccessful: false,
            errors: [new Error(`Parameter {thing} is not defined`)],
            executionReport: {
                title: 'Sample prompt',
                description: 'Show how to use a simple completion prompt',
                promptExecutions: [],
                promptbookUrl: 'https://example.com/promptbook.json',
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
        }));
});
