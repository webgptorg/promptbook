import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { promptbookStringToJson } from '../../../conversion/promptbookStringToJson';
import { PromptbookString } from '../../../types/PromptbookString';
import { assertsExecutionSuccessful } from '../../assertsExecutionSuccessful';
import { createPtbkExecutor } from '../../createPtbkExecutor';
import { MockedEchoNaturalExecutionTools } from '../natural-execution-tools/mocked/MockedEchoNaturalExecutionTools';
import { CallbackInterfaceTools } from '../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { JavascriptEvalExecutionTools } from './javascript/JavascriptEvalExecutionTools';

describe('createPtbkExecutor + executing scripts in ptbk', () => {
    const promptbook = promptbookStringToJson(
        spaceTrim(`
            # Sample prompt

            Show how to execute a script

            -   PTBK VERSION 1.0.0
            -   INPUT  PARAMETER {thing} Any thing to buy

            ## Execution

            -   EXECUTE SCRIPT

            \`\`\`javascript
            if(/Apple/i.test(thing)){
                throw new Error('I do not like Apples!');
            }
            return thing.split('a').join('b')
            \`\`\`

            -> {bhing}
         `) as PromptbookString,
    );
    const ptbkExecutor = createPtbkExecutor({
      promptbook,
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

    it('should work when every INPUT  PARAMETER is allowed', () => {
        expect(ptbkExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'b cup of coffee',
            },
        });
        expect(ptbkExecutor({ thing: 'arrow' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'brrow',
            },
        });
        expect(ptbkExecutor({ thing: 'aaa' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'bbb',
            },
        });
    });

    it('should fail when INPUT  PARAMETER is NOT allowed', () => {
        for (const thing of ['apple', 'apples', 'an apple', 'Apple', 'The Apple', '🍏 Apple', 'Apple 🍎']) {
            expect(ptbkExecutor({ thing }, () => {})).resolves.toMatchObject({
                isSuccessful: false,
                errors: [new Error(`I do not like Apples!`)],
            });

            expect(() => ptbkExecutor({ thing }, () => {}).then(assertsExecutionSuccessful)).rejects.toThrowError(
                /I do not like Apples!/,
            );
        }
    });
});
