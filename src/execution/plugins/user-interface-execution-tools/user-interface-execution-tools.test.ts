import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { promptbookStringToJson } from '../../../conversion/promptbookStringToJson';
import { PromptbookString } from '../../../types/PromptbookString';
import { assertsExecutionSuccessful } from '../../assertsExecutionSuccessful';
import { createPromptbookExecutor } from '../../createPromptbookExecutor';
import { MockedEchoLlmExecutionTools } from '../llm-execution-tools/mocked/MockedEchoLlmExecutionTools';
import { CallbackInterfaceTools } from '../user-interface-execution-tools/callback/CallbackInterfaceTools';

describe('createPromptbookExecutor + executing user interface prompts in promptbook', () => {
    const promptbook = promptbookStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use prompt dialog

            -   PROMPTBOOK VERSION 1.0.0
            -   INPUT  PARAMETER {thing} Any thing to buy
            -   OUTPUT PARAMETER {favoriteThing}

            ## Thing

            -   PROMPT DIALOG

            What is your favorite {thing} to buy?

            \`\`\`text
            {thing}
            \`\`\`

            -> {favoriteThing}
         `) as PromptbookString,
    );
    const promptbookExecutor = createPromptbookExecutor({
        promptbook,
        tools: {
            llm: new MockedEchoLlmExecutionTools({ isVerbose: true }),
            script: [],
            userInterface: new CallbackInterfaceTools({
                isVerbose: true,
                async callback({ promptTitle, promptMessage, defaultValue }) {
                    return `Answer to question "${promptTitle}: ${promptMessage}" is not ${defaultValue} but Pear.`;
                },
            }),
        },
        settings: {
            maxExecutionAttempts: 3,
        },
    });

    it('should work when every INPUT  PARAMETER defined', () => {
        expect(promptbookExecutor({ thing: 'apple' }, () => {})).resolves.toMatchObject({
            outputParameters: {
                favoriteThing: 'Answer to question "Thing: What is your favorite apple to buy?" is not apple but Pear.',
            },
        });
        expect(promptbookExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            outputParameters: {
                favoriteThing:
                    'Answer to question "Thing: What is your favorite a cup of coffee to buy?" is not a cup of coffee but Pear.',
            },
        });
    });

    it('should fail when some INPUT  PARAMETER is missing', () => {
        expect(promptbookExecutor({}, () => {})).resolves.toMatchObject({
            isSuccessful: false,
            errors: [new Error(`Parameter {thing} is not defined`)],
        });

        expect(() => promptbookExecutor({}, () => {}).then(assertsExecutionSuccessful)).rejects.toThrowError(
            /Parameter \{thing\} is not defined/,
        );
    });
});
