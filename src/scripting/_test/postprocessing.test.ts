import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor';
import { CallbackInterfaceTools } from '../../knowledge/dialogs/callback/CallbackInterfaceTools';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../types/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + postprocessing', () => {
    it('should work when every INPUT  PARAMETER defined', async () => {
        const pipelineExecutor = await getPipelineExecutor();

        expect(pipelineExecutor({ yourName: 'Paůl' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'LUA_P_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(pipelineExecutor({ yourName: 'Adam' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'MAD_A_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(pipelineExecutor({ yourName: 'John' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'NHO_J_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(pipelineExecutor({ yourName: 'DAVID' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'DIVAD_OLLE_H_DIAS_UO_Y',
            },
        });
    });
});

async function getPipelineExecutor() {
    const pipeline = await pipelineStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use postprocessing

            -   PROMPTBOOK VERSION 1.0.0
            -   MODEL VARIANT Chat
            -   MODEL NAME gpt-3.5-turbo
            -   INPUT  PARAMETER {yourName} Name of the hero
            -   OUTPUT PARAMETER {greeting}

            ## Question

            -   POSTPROCESSING reverse
            -   POSTPROCESSING removeDiacritics
            -   POSTPROCESSING normalizeTo_SCREAMING_CASE

            \`\`\`markdown
            Hello {yourName}!
            \`\`\`

            -> {greeting}
       `) as PipelineString,
    );

    const pipelineExecutor = createPipelineExecutor({
        pipeline,
        tools: {
            llm: new MockedEchoLlmExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                { isVerbose: true },
            ),
            script: [
                new JavascriptExecutionTools(
                    //            <- TODO: [🧱] Implement in a functional (not new Class) way
                    {
                        isVerbose: true,
                        // Note: [🕎] Custom functions are tested elsewhere
                    },
                ),
            ],
            userInterface: new CallbackInterfaceTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                {
                    isVerbose: true,
                    async callback() {
                        return 'Hello';
                    },
                },
            ),
        },
    });

    return pipelineExecutor;
}
