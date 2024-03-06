import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { promptbookStringToJson } from '../../../../conversion/promptbookStringToJson';
import { PromptbookString } from '../../../../types/PromptbookString';
import { PTBK_VERSION } from '../../../../version';
import { createPtbkExecutor } from '../../../createPtbkExecutor';
import { CallbackInterfaceTools } from '../../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { MockedEchoNaturalExecutionTools } from './MockedEchoNaturalExecutionTools';

describe('createPtbkExecutor + MockedEchoExecutionTools with sample chat prompt', () => {
    const ptbk = promptbookStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use a simple completion prompt

            -   PTBK VERSION 1.0.0
            -   PTBK URL https://example.com/ptbk.json
            -   INPUT  PARAMETER {thing} Any thing to buy

            ## Prompt

            - MODEL VARIANT COMPLETION
            - MODEL NAME \`gpt-3.5-turbo-instruct\`

            \`\`\`
            One day I went to the shop and bought {thing}.
            Now I have {thing}.
            \`\`\`

            -> {response}
         `) as PromptbookString,
    );
    const ptbkExecutor = createPtbkExecutor({
        ptbk,
        tools: {
            natural: new MockedEchoNaturalExecutionTools({ isVerbose: true }),
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

    it('should work when every INPUT  PARAMETER defined', () => {
        expect(ptbkExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            outputParameters: {
                thing: 'a cup of coffee',
                response: spaceTrim(`
                    One day I went to the shop and bought a cup of coffee.
                    Now I have a cup of coffee.
                    And so on...
                `),
            },
        });
    });

    it('should fail when some INPUT  PARAMETER is missing', () => {
        expect(ptbkExecutor({}, () => {})).resolves.toEqual({
            isSuccessful: false,
            errors: [new Error(`Parameter {thing} is not defined`)],
            executionReport: {
                title: 'Sample prompt',
                description: 'Show how to use a simple completion prompt',
                promptExecutions: [],
                ptbkUrl: 'https://example.com/ptbk.json',
                ptbkRequestedVersion: '1.0.0',
                ptbkUsedVersion: PTBK_VERSION,
            },
            outputParameters: {},
        });
    });

    /*
    TODO: [🧠] Should be this failing or not?
    it('should fail when there is INPUT  PARAMETER extra', () => {
        expect(ptbkExecutor({ thing: 'a cup of coffee', sound: 'Meow!' }, () => {})).rejects.toThrowError(/Parameter \{sound\} should not be defined/i);
    });
    */
});

/**
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPtbkExecutor.test.ts"
 */
