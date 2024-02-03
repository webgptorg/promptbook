import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { PromptTemplatePipeline } from '../../../classes/PromptTemplatePipeline';
import { promptTemplatePipelineStringToJson } from '../../../conversion/promptTemplatePipelineStringToJson';
import { PromptTemplatePipelineString } from '../../../types/PromptTemplatePipelineString';
import { assertsExecutionSuccessful } from '../../assertsExecutionSuccessful';
import { createPtpExecutor } from '../../createPtpExecutor';
import { MockedEchoNaturalExecutionTools } from '../natural-execution-tools/mocked/MockedEchoNaturalExecutionTools';
import { CallbackInterfaceTools } from '../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { JavascriptEvalExecutionTools } from './javascript/JavascriptEvalExecutionTools';

describe('createPtpExecutor + executing scripts in ptp', () => {
    const ptbJson = promptTemplatePipelineStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use a simple prompt with no parameters.

            -   PTBK version 1.0.0
            -   Input parameter {thing} Any thing to buy

            ## Execution

            -   Execute script

            \`\`\`javascript
            thing.split('a').join('b')
            \`\`\`

            -> {bhing}
         `) as PromptTemplatePipelineString,
    );
    const ptp = PromptTemplatePipeline.fromJson(ptbJson);
    const ptpExecutor = createPtpExecutor({
        ptp,
        tools: {
            natural: new MockedEchoNaturalExecutionTools({ isVerbose: true }),
            script: [new JavascriptEvalExecutionTools({ isVerbose: true })],
            userInterface: new CallbackInterfaceTools({
                isVerbose: true,
                async callback() {
                    return 'Hello';
                },
            }),
        },
        settings: {
            maxNaturalExecutionAttempts: 3,
        },
    });

    it('should work when every input parameter defined', () => {
        expect(ptpExecutor({ thing: 'apple' }, () => {})).resolves.toMatchObject({
            outputParameters: {
                bhing: 'bpple',
            },
        });
        expect(ptpExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            outputParameters: {
                bhing: 'b cup of coffee',
            },
        });
    });

    it('should fail when some input parameter is missing', () => {
        expect(ptpExecutor({}, () => {})).resolves.toMatchObject({
            errors: [new Error(`Parameter {thing} is not defined`)],
        });

        expect(() => ptpExecutor({}, () => {}).then(assertsExecutionSuccessful)).rejects.toThrowError(
            /Parameter \{thing\} is not defined/,
        );
    });
});
