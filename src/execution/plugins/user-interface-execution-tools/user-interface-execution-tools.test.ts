import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { promptbookStringToJson } from '../../../conversion/promptbookStringToJson';
import { PromptbookString } from '../../../types/PromptbookString';
import { assertsExecutionSuccessful } from '../../assertsExecutionSuccessful';
import { createPtbkExecutor } from '../../createPtbkExecutor';
import { MockedEchoNaturalExecutionTools } from '../natural-execution-tools/mocked/MockedEchoNaturalExecutionTools';
import { CallbackInterfaceTools } from '../user-interface-execution-tools/callback/CallbackInterfaceTools';

describe('createPtbkExecutor + executing user interface prompts in ptbk', () => {
    const promptbook = promptbookStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to use prompt dialog

            -   PTBK VERSION 1.0.0
            -   INPUT  PARAMETER {thing} Any thing to buy

            ## Thing

            -   PROMPT DIALOG

            What is your favorite {thing} to buy?

            \`\`\`text
            {thing}
            \`\`\`

            -> {favoriteThing}
         `) as PromptbookString,
    );
    const ptbkExecutor = createPtbkExecutor({
        promptbook,
        tools: {
            natural: new MockedEchoNaturalExecutionTools({ isVerbose: true }),
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
        expect(ptbkExecutor({ thing: 'apple' }, () => {})).resolves.toMatchObject({
            outputParameters: {
                favoriteThing: 'Answer to question "Thing: What is your favorite apple to buy?" is not apple but Pear.',
            },
        });
        expect(ptbkExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            outputParameters: {
                favoriteThing:
                    'Answer to question "Thing: What is your favorite a cup of coffee to buy?" is not a cup of coffee but Pear.',
            },
        });
    });

    it('should fail when some INPUT  PARAMETER is missing', () => {
        expect(ptbkExecutor({}, () => {})).resolves.toMatchObject({
            isSuccessful: false,
            errors: [new Error(`Parameter {thing} is not defined`)],
        });

        expect(() => ptbkExecutor({}, () => {}).then(assertsExecutionSuccessful)).rejects.toThrowError(
            /Parameter \{thing\} is not defined/,
        );
    });
});
