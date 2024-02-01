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
            -   Input parameter {yourName} Name of the hero

            ## Question

            -   Postprocess reverse
            -   Postprocess removeDiacritics
            -   Postprocess normalizeTo_SCREAMING_CASE

            \`\`\`markdown
            Hello {yourName}!
            \`\`\`

            -> {greeting}
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
        expect(ptpExecutor({ yourName: 'Paůl' }, () => {})).resolves.toMatchObject({
            greeting: 'LUA_P_OLLE_H_DIAS_UO_Y',
        });

        expect(ptpExecutor({ yourName: 'Adam' }, () => {})).resolves.toMatchObject({
            greeting: 'MAD_A_OLLE_H_DIAS_UO_Y',
        });

        expect(ptpExecutor({ yourName: 'John' }, () => {})).resolves.toMatchObject({
            greeting: 'NHO_J_OLLE_H_DIAS_UO_Y',
        });

        expect(ptpExecutor({ yourName: 'DAVID' }, () => {})).resolves.toMatchObject({
            greeting: 'DIVAD_OLLE_H_DIAS_UO_Y',
        });
    });
});

/**
 * TODO: What is the ideal folder for this test?
 */
