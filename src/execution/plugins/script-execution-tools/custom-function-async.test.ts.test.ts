import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
import { promptbookStringToJson } from '../../../conversion/promptbookStringToJson';
import { CallbackInterfaceTools } from '../../../knowledgebase/dialogs/callback/CallbackInterfaceTools';
import { MockedEchoLlmExecutionTools } from '../../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import { JavascriptExecutionTools } from '../../../scripting/javascript/JavascriptExecutionTools';
import type { PromptbookString } from '../../../types/PromptbookString';
import { createPromptbookExecutor } from '../../createPromptbookExecutor';

describe('createPromptbookExecutor + custom async function ', () => {
    const promptbook = promptbookStringToJson(
        spaceTrim(`
            # Custom functions

            Show how to use custom postprocessing async function

            -   PROMPTBOOK VERSION 1.0.0
            -   INPUT  PARAMETER {yourName} Name of the hero
            -   OUTPUT PARAMETER {greeting}

            ## Question

            -   SIMPLE TEMPLATE
            -   POSTPROCESSING addHello

            \`\`\`markdown
            {yourName} the Evangelist
            \`\`\`

            -> {greeting}
         `) as PromptbookString,
    );

    const promptbookExecutor = createPromptbookExecutor({
        promptbook,
        tools: {
            llm: new MockedEchoLlmExecutionTools({ isVerbose: true }),
            script: [
                new JavascriptExecutionTools({
                    isVerbose: true,

                    // Note: [🕎]
                    functions: {
                        async addHello(value) {
                            await forTime(1000);
                            return `Hello ${value}`;
                        },
                    },
                }),
            ],
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

    it('should use custom postprocessing function', () => {
        expect(promptbookExecutor({ yourName: 'Matthew' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Matthew the Evangelist',
            },
        });

        expect(promptbookExecutor({ yourName: 'Mark' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Mark the Evangelist',
            },
        });

        expect(promptbookExecutor({ yourName: 'Luke' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Luke the Evangelist',
            },
        });

        expect(promptbookExecutor({ yourName: 'John' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello John the Evangelist',
            },
        });
    });
});
