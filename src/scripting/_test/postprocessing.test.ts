import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { createPromptbookExecutor } from '../../execution/createPromptbookExecutor';
import { CallbackInterfaceTools } from '../../knowledge/dialogs/callback/CallbackInterfaceTools';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../types/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPromptbookExecutor + postprocessing', () => {
    it('should work when every INPUT  PARAMETER defined', async () => {
        const promptbookExecutor = await getPromptbookExecutor();

        expect(promptbookExecutor({ yourName: 'Paůl' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'LUA_P_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(promptbookExecutor({ yourName: 'Adam' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'MAD_A_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(promptbookExecutor({ yourName: 'John' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'NHO_J_OLLE_H_DIAS_UO_Y',
            },
        });

        expect(promptbookExecutor({ yourName: 'DAVID' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'DIVAD_OLLE_H_DIAS_UO_Y',
            },
        });
    });
});

async function getPromptbookExecutor() {
    const promptbook = await pipelineStringToJson(
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

    const promptbookExecutor = createPromptbookExecutor({
        promptbook,
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
        settings: {
            maxExecutionAttempts: 3,
        },
    });

    return promptbookExecutor;
}
