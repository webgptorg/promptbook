import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { assertsExecutionSuccessful } from '../../execution/assertsExecutionSuccessful';
import { createPromptbookExecutor } from '../../execution/createPromptbookExecutor';
import { CallbackInterfaceTools } from '../../knowledge/dialogs/callback/CallbackInterfaceTools';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../types/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPromptbookExecutor + executing scripts in promptbook', () => {
    it('should work when every INPUT  PARAMETER defined', () => {
        expect(
            getPromptbookExecutor().then((promptbookExecutor) => promptbookExecutor({ thing: 'apple' }, () => {})),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'bpple',
            },
        });
        expect(
            getPromptbookExecutor().then((promptbookExecutor) =>
                promptbookExecutor({ thing: 'a cup of coffee' }, () => {}),
            ),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'b cup of coffee',
            },
        });
    });

    it('should fail when some INPUT  PARAMETER is missing', () => {
        expect(
            getPromptbookExecutor().then((promptbookExecutor) => promptbookExecutor({}, () => {})),
        ).resolves.toMatchObject({
            isSuccessful: false,
            /*
            TODO:
            errors: [
                new PromptbookExecutionError(
                    spaceTrim(`
                        Parameter {thing} is not defined

                        This happen during evaluation of the javascript, which has access to the following parameters as javascript variables:

                        The script is:
                        \`\`\`javascript
                        return thing.split('a').join('b')
                        \`\`\`

                        Original error message:
                        thing is not defined
                  `),
                ),
            ],
            */
        });

        expect(() =>
            getPromptbookExecutor()
                .then((promptbookExecutor) => promptbookExecutor({}, () => {}))
                .then(assertsExecutionSuccessful),
        ).rejects.toThrowError(/Parameter \{thing\} is not defined/);
    });
});

async function getPromptbookExecutor() {
    const promptbook = await pipelineStringToJson(
        spaceTrim(`
          # Sample prompt

          Show how to execute a script

          -   PROMPTBOOK VERSION 1.0.0
          -   INPUT  PARAMETER {thing} Any thing to buy
          -   OUTPUT PARAMETER {bhing}

          ## Execution

          -   EXECUTE SCRIPT

          \`\`\`javascript
          thing.split('a').join('b')
          \`\`\`

          -> {bhing}
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
