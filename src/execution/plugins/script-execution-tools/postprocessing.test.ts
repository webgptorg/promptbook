import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { promptbookStringToJson } from './../../../conversion/promptbookStringToJson';
import type { PromptbookString } from './../../../types/PromptbookString';
import { createPromptbookExecutor } from './../../createPromptbookExecutor';
import { MockedEchoLlmExecutionTools } from './../llm-execution-tools/mocked/MockedEchoLlmExecutionTools';
import { CallbackInterfaceTools } from './../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { JavascriptExecutionTools } from './javascript/JavascriptExecutionTools';

describe('createPromptbookExecutor + postprocessing', () => {
    const promptbook = promptbookStringToJson(
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
         `) as PromptbookString,
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

    it('should work when every INPUT  PARAMETER defined', () => {
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
