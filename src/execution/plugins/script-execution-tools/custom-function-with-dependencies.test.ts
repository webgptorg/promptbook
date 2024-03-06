import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { countCharacters, countWords } from '../../../_packages/utils.index';
import { promptbookStringToJson } from '../../../conversion/promptbookStringToJson';
import { PromptbookString } from '../../../types/PromptbookString';
import { createPtbkExecutor } from '../../createPtbkExecutor';
import { MockedEchoNaturalExecutionTools } from '../natural-execution-tools/mocked/MockedEchoNaturalExecutionTools';
import { CallbackInterfaceTools } from '../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { JavascriptEvalExecutionTools } from './javascript/JavascriptEvalExecutionTools';

describe('createPtbkExecutor + custom function with dependencies', () => {
    const promptbook = promptbookStringToJson(
        spaceTrim(`
            # Custom functions

            Show how to use custom postprocessing functions with dependencies

            -   PTBK VERSION 1.0.0
            -   INPUT  PARAMETER {yourName} Name of the hero

            ## Question

            -   SIMPLE TEMPLATE
            -   POSTPROCESSING addHello
            -   POSTPROCESSING withStatistics

            \`\`\`markdown
            {yourName} the Evangelist
            \`\`\`

            -> {greeting}
         `) as PromptbookString,
    );

    const ptbkExecutor = createPtbkExecutor({
      promptbook,
        tools: {
            natural: new MockedEchoNaturalExecutionTools({ isVerbose: true }),
            script: [
                new JavascriptEvalExecutionTools({
                    isVerbose: true,

                    // Note: [🕎]
                    functions: {
                        addHello(value) {
                            return `Hello ${value}`;
                        },
                        withStatistics(value) {
                            // Note: Testing custom function with dependencies
                            return value + ` (${countCharacters(value)} characters, ${countWords(value)} words)`;
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
        expect(ptbkExecutor({ yourName: 'Matthew' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Matthew the Evangelist (28 characters, 4 words)',
            },
        });

        expect(ptbkExecutor({ yourName: 'Mark' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Mark the Evangelist (25 characters, 4 words)',
            },
        });

        expect(ptbkExecutor({ yourName: 'Luke' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Luke the Evangelist (25 characters, 4 words)',
            },
        });

        expect(ptbkExecutor({ yourName: 'John' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello John the Evangelist (25 characters, 4 words)',
            },
        });
    });
});
