import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { promptTemplatePipelineStringToJson } from '../../../conversion/promptTemplatePipelineStringToJson';
import { PromptTemplatePipelineString } from '../../../types/PromptTemplatePipelineString';
import { createPtpExecutor } from '../../createPtpExecutor';
import { MockedEchoNaturalExecutionTools } from '../natural-execution-tools/mocked/MockedEchoNaturalExecutionTools';
import { CallbackInterfaceTools } from '../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { JavascriptEvalExecutionTools } from './javascript/JavascriptEvalExecutionTools';

describe('createPtpExecutor + postprocessing', () => {
    const ptp = promptTemplatePipelineStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use postprocessing

            -   PTBK VERSION 1.0.0
            -   INPUT  PARAMETER {yourName} Name of the hero

            ## Question

            -   POSTPROCESSING reverse
            -   POSTPROCESSING removeDiacritics
            -   POSTPROCESSING normalizeTo_SCREAMING_CASE

            \`\`\`markdown
            Hello {yourName}!
            \`\`\`

            -> {greeting}
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
        expect(ptpExecutor({ yourName: 'Paůl' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'LUA_P_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(ptpExecutor({ yourName: 'Adam' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'MAD_A_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(ptpExecutor({ yourName: 'John' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'NHO_J_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(ptpExecutor({ yourName: 'DAVID' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'DIVAD_OLLE_H_DIAS_UO_Y',
            },
        });
    });
});
