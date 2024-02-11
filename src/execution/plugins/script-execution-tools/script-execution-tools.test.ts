import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { promptTemplatePipelineStringToJson } from '../../../conversion/promptTemplatePipelineStringToJson';
import { PromptTemplatePipelineString } from '../../../types/PromptTemplatePipelineString';
import { assertsExecutionSuccessful } from '../../assertsExecutionSuccessful';
import { createPtpExecutor } from '../../createPtpExecutor';
import { MockedEchoNaturalExecutionTools } from '../natural-execution-tools/mocked/MockedEchoNaturalExecutionTools';
import { CallbackInterfaceTools } from '../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { JavascriptEvalExecutionTools } from './javascript/JavascriptEvalExecutionTools';

describe('createPtpExecutor + executing scripts in ptp', () => {
    const ptp = promptTemplatePipelineStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to execute a script

            -   PTBK VERSION 1.0.0
            -   INPUT  PARAMETER {thing} Any thing to buy

            ## Execution

            -   EXECUTE SCRIPT

            \`\`\`javascript
            thing.split('a').join('b')
            \`\`\`

            -> {bhing}
         `) as PromptTemplatePipelineString,
    );
    const ptpExecutor = createPtpExecutor({
        ptp,
        tools: {
            natural: new MockedEchoNaturalExecutionTools({ isVerbose: true }),
            script: [
                new JavascriptEvalExecutionTools({
                    isVerbose: true,
                    // Note: [🕎] Custom functions are tested elsewhere
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

    it('should work when every INPUT  PARAMETER defined', () => {
        expect(ptpExecutor({ thing: 'apple' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'bpple',
            },
        });
        expect(ptpExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'b cup of coffee',
            },
        });
    });

    it('should fail when some INPUT  PARAMETER is missing', () => {
        expect(ptpExecutor({}, () => {})).resolves.toMatchObject({
            isSuccessful: false,
            errors: [
                new Error(
                    spaceTrim(`
                        Parameter {thing} is not defined
                        
                        This happen during evaluation of the javascript, which has access to the following parameters as javascript variables:
                        
                        
                        The script is:
                        
                        return thing.split('a').join('b')
                  `),
                ),
            ],
        });

        expect(() => ptpExecutor({}, () => {}).then(assertsExecutionSuccessful)).rejects.toThrowError(
            /Parameter \{thing\} is not defined/,
        );
    });
});
