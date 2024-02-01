import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { PromptTemplatePipeline } from '../../../classes/PromptTemplatePipeline';
import { promptTemplatePipelineStringToJson } from '../../../conversion/promptTemplatePipelineStringToJson';
import { PromptTemplatePipelineString } from '../../../types/PromptTemplatePipelineString';
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
            if(/Apple/i.test(thing)){
                throw new Error('I do not like Apples!');
            }
            return thing.split('a').join('b')
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

    it('should work when every input parameter is allowed', () => {
        expect(ptpExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            bhing: 'b cup of coffee',
        });
        expect(ptpExecutor({ thing: 'arrow' }, () => {})).resolves.toMatchObject({
            bhing: 'brrow',
        });
        expect(ptpExecutor({ thing: 'aaa' }, () => {})).resolves.toMatchObject({
            bhing: 'bbb',
        });
    });

    it('should fail when input parameter is NOT allowed', () => {
        expect(() => ptpExecutor({ thing: 'apple' }, () => {})).rejects.toThrowError(/I do not like Apples/i);
        expect(() => ptpExecutor({ thing: 'apples' }, () => {})).rejects.toThrowError(/I do not like Apples/i);
        expect(() => ptpExecutor({ thing: 'an apple' }, () => {})).rejects.toThrowError(/I do not like Apples/i);
        expect(() => ptpExecutor({ thing: 'Apple' }, () => {})).rejects.toThrowError(/I do not like Apples/i);
        expect(() => ptpExecutor({ thing: 'The Apple' }, () => {})).rejects.toThrowError(/I do not like Apples/i);
        expect(() => ptpExecutor({ thing: '🍏 Apple' }, () => {})).rejects.toThrowError(/I do not like Apples/i);
        expect(() => ptpExecutor({ thing: 'Apple 🍎' }, () => {})).rejects.toThrowError(/I do not like Apples/i);
    });
});
