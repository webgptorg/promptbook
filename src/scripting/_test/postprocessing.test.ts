import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../pipeline/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + postprocessing', () => {
    it('should work when every INPUT  PARAMETER defined', async () => {
        const pipelineExecutor = await getPipelineExecutor();

        expect(pipelineExecutor({ yourName: 'Paůl' }).asPromise()).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'LUA_P_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(pipelineExecutor({ yourName: 'Adam' }).asPromise()).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'MAD_A_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(pipelineExecutor({ yourName: 'John' }).asPromise()).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'NHO_J_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(pipelineExecutor({ yourName: 'DAVID' }).asPromise()).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'DIVAD_OLLE_H_DIAS_UO_Y',
            },
        });
    });
});

async function getPipelineExecutor() {
    const pipeline = await compilePipeline(
        spaceTrim(`
            # Example prompt

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
        // <- TODO: [📼] Use`book\`` string literal notation
    );

    const pipelineExecutor = createPipelineExecutor({
        pipeline,
        tools: {
            llm: new MockedEchoLlmExecutionTools({ isVerbose: true }),
            script: [
                new JavascriptExecutionTools({
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
    });

    return pipelineExecutor;
}
