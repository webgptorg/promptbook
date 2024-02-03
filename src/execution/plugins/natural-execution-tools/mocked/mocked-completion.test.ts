import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { PromptTemplatePipeline } from '../../../../classes/PromptTemplatePipeline';
import { PTBK_VERSION } from '../../../../config';
import { promptTemplatePipelineStringToJson } from '../../../../conversion/promptTemplatePipelineStringToJson';
import { PromptTemplatePipelineString } from '../../../../types/PromptTemplatePipelineString';
import { createPtpExecutor } from '../../../createPtpExecutor';
import { CallbackInterfaceTools } from '../../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { MockedEchoNaturalExecutionTools } from './MockedEchoNaturalExecutionTools';

describe('createPtpExecutor + MockedEchoExecutionTools with sample chat prompt', () => {
    const ptbJson = promptTemplatePipelineStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use a simple prompt with no parameters.

            -   PTBK version 1.0.0
            -   PTBK URL https://example.com/ptbk.json
            -   Input parameter {thing} Any thing to buy

            ## Prompt

            - MODEL VARIANT Completion
            - MODEL NAME \`gpt-3.5-turbo-instruct\`

            \`\`\`
            One day I went to the shop and bought {thing}.
            Now I have {thing}.
            \`\`\`

            -> {response}
         `) as PromptTemplatePipelineString,
    );
    const ptp = PromptTemplatePipeline.fromJson(ptbJson);
    const ptpExecutor = createPtpExecutor({
        ptp,
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

    it('should work when every input parameter defined', () => {
        expect(ptpExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
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

    it('should fail when some input parameter is missing', () => {
        expect(ptpExecutor({}, () => {})).resolves.toEqual({
            errors: [new Error(`Parameter {thing} is not defined`)],
            executionReport: {
                title: 'Sample prompt',
                description: '1.0.0' /* <- !!!!! */,
                promptExecutions: [],
                ptbkUrl: 'https://example.com/ptbk.json',
                ptbkRequestedVersion: '1.0.0',
                ptbkUsedVersion: PTBK_VERSION,
            },
            isSuccessful: false,
            outputParameters: {},
        });
    });

    /*
    TODO: [🧠] Should be this failing or not?
    it('should fail when there is input parameter extra', () => {
        expect(ptpExecutor({ thing: 'a cup of coffee', sound: 'Meow!' }, () => {})).rejects.toThrowError(/Parameter \{sound\} should not be defined/i);
    });
    */
});

/**
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPtpExecutor.test.ts"
 */
