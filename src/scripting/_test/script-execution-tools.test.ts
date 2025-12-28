import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../pipeline/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + executing scripts in promptbook', () => {
    it('should work when every INPUT  PARAMETER defined', async () => {
        await expect(
            getPipelineExecutor().then((pipelineExecutor) =>
                pipelineExecutor({ thing: 'apple' }).asPromise({ isCrashedOnError: true }),
            ),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'bpple',
            },
        });
        await expect(
            getPipelineExecutor().then((pipelineExecutor) =>
                pipelineExecutor({ thing: 'a cup of coffee' }).asPromise({ isCrashedOnError: true }),
            ),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'b cup of coffee',
            },
        });
    });

    it('should fail when some INPUT  PARAMETER is missing', async () => {
        await expect(
            getPipelineExecutor().then((pipelineExecutor) =>
                pipelineExecutor({}).asPromise({ isCrashedOnError: false }),
            ),
        ).resolves.toMatchObject({
            isSuccessful: false,
            /*
            TODO:
            errors: [
                new PipelineExecutionError(
                    spaceTrim(`
                        Parameter `{thing}` is not defined

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

        await expect(() =>
            getPipelineExecutor().then((pipelineExecutor) =>
                pipelineExecutor({}).asPromise({ isCrashedOnError: true }),
            ),
        ).rejects.toThrowError(/Parameter `\{thing\}` is required as an input parameter/);
    });
});

async function getPipelineExecutor() {
    const pipeline = await compilePipeline(
        spaceTrim(`
          # Example prompt

          Show how to execute a script

          -   PROMPTBOOK VERSION 1.0.0
          -   INPUT  PARAMETER {thing} Any thing to buy
          -   OUTPUT PARAMETER {bhing}

          ## Execution

          -   SCRIPT TEMPLATE

          \`\`\`javascript
          thing.split('a').join('b')
          \`\`\`

          -> {bhing}
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
