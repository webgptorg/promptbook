import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { assertsExecutionSuccessful } from '../../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor';
import { CallbackInterfaceTools } from '../../knowledge/dialogs/callback/CallbackInterfaceTools';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../types/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + executing scripts in promptbook', () => {
    it('should work when every INPUT  PARAMETER defined', () => {
        expect(
            getPipelineExecutor().then((pipelineExecutor) => pipelineExecutor({ thing: 'apple' }, () => {})),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'bpple',
            },
        });
        expect(
            getPipelineExecutor().then((pipelineExecutor) => pipelineExecutor({ thing: 'a cup of coffee' }, () => {})),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'b cup of coffee',
            },
        });
    });

    it('should fail when some INPUT  PARAMETER is missing', () => {
        expect(getPipelineExecutor().then((pipelineExecutor) => pipelineExecutor({}, () => {}))).resolves.toMatchObject(
            {
                isSuccessful: false,
                /*
            TODO:
            errors: [
                new PipelineExecutionError(
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
            },
        );

        expect(() =>
            getPipelineExecutor()
                .then((pipelineExecutor) => pipelineExecutor({}, () => {}))
                .then(assertsExecutionSuccessful),
        ).rejects.toThrowError(/Parameter \{thing\} is not defined/);
    });
});

async function getPipelineExecutor() {
    const pipeline = await pipelineStringToJson(
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
        settings: {
            maxExecutionAttempts: 3,
        },
    });

    return pipelineExecutor;
}
