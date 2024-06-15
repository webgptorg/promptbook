import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { promptbookStringToJson } from '../../../../conversion/promptbookStringToJson';
import type { PromptbookString } from '../../../../types/PromptbookString';
import { PROMPTBOOK_VERSION } from '../../../../version';
import { createPromptbookExecutor } from '../../../createPromptbookExecutor';
import { CallbackInterfaceTools } from '../../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { MockedEchoLlmExecutionTools } from './MockedEchoLlmExecutionTools';

describe('createPromptbookExecutor + MockedEchoExecutionTools with sample chat prompt', () => {
    const promptbook = promptbookStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use a simple chat prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PROMPTBOOK URL https://example.com/promptbook.json
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
         `) as PromptbookString,
    );
    const promptbookExecutor = createPromptbookExecutor({
        promptbook,
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
        settings: {
            maxExecutionAttempts: 3,
        },
    });

    it('should work when every INPUT PARAMETER defined', () =>
        expect(promptbookExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            executionReport: {
                title: 'Sample prompt',
                promptbookRequestedVersion: '1.0.0',
                promptbookUrl: 'https://example.com/promptbook.json',
                promptbookUsedVersion: PROMPTBOOK_VERSION,
            },
            outputParameters: {
                response: spaceTrim(`
                    You said:
                    One day I went to the shop and bought a cup of coffee.
                    Now I have a cup of coffee.
                `),
            },
        }));

    it('should fail when some INPUT PARAMETER is missing', () =>
        expect(promptbookExecutor({}, () => {})).resolves.toEqual({
            isSuccessful: false,
            errors: [new Error(`Parameter {thing} is not defined`)],
            executionReport: {
                title: 'Sample prompt',
                description: 'Show how to use a simple chat prompt',
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

    /*
    TODO: [🧠] Should be this failing or not?
    it('should fail when there is INPUT  PARAMETER extra', () => {
        expect(promptbookExecutor({ thing: 'a cup of coffee', sound: 'Meow!' }, () => {})).rejects.toThrowError(/Parameter \{sound\} should not be defined/i);
    });
    */
});

/**
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPromptbookExecutor.test.ts"
 */
