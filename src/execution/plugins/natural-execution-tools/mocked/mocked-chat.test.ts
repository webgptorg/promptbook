import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { PromptTemplatePipeline } from '../../../../classes/PromptTemplatePipeline';
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
            -   Input parameter {thing} Any thing to buy

            ## Prompt

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
    });

    it('should work when every input parameter defined', () => {
        expect(ptpExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            response: spaceTrim(`
                You said:
                One day I went to the shop and bought a cup of coffee.
                Now I have a cup of coffee.
            `),
        });
    });

    it('should fail when some input parameter is missing', () => {
        expect(ptpExecutor({}, () => {})).rejects.toThrowError(/Parameter \{thing\} is not defined/i);
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
