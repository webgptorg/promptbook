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
            thing.split('a').join('b')
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

    it('should work when every INPUT  PARAMETER defined', () => {
        expect(ptbkExecutor({ thing: 'apple' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'bpple',
            },
        });
        expect(ptbkExecutor({ thing: 'a cup of coffee' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'b cup of coffee',
            },
        });
    });

    it('should fail when some INPUT  PARAMETER is missing', () => {
        expect(ptbkExecutor({}, () => {})).resolves.toMatchObject({
            isSuccessful: false,
            errors: [
                new Error(
                    spaceTrim(`
                        Parameter {thing} is not defined

                        This happen during evaluation of the javascript, which has access to the following parameters as javascript variables:


                        The script is:

                        return thing.split('a').join('b')
                  `),
                ),
            ],
        });

        expect(() => ptbkExecutor({}, () => {}).then(assertsExecutionSuccessful)).rejects.toThrowError(
            /Parameter \{thing\} is not defined/,
        );
    });
});
