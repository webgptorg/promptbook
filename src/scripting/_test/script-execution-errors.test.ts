import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../pipeline/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + executing scripts in promptbook', () => {
    it('should work when every INPUT  PARAMETER is allowed', async () => {
        const pipelineExecutor = await getPipelineExecutor();

        await expect(
            pipelineExecutor({ thing: 'a cup of coffee' }).asPromise({ isCrashedOnError: true }),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'b cup of coffee',
            },
        });
        await expect(pipelineExecutor({ thing: 'arrow' }).asPromise({ isCrashedOnError: true })).resolves.toMatchObject(
            {
                isSuccessful: true,
                errors: [],
                outputParameters: {
                    bhing: 'brrow',
                },
            },
        );
        await expect(pipelineExecutor({ thing: 'aaa' }).asPromise({ isCrashedOnError: true })).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                bhing: 'bbb',
            },
        });
    });

    it('should fail when INPUT  PARAMETER is NOT allowed', async () => {
        const pipelineExecutor = await getPipelineExecutor();

        for (const thing of ['apple', 'apples', 'an apple', 'Apple', 'The Apple', '🍏 Apple', 'Apple 🍎']) {
            await expect(pipelineExecutor({ thing }).asPromise({ isCrashedOnError: false })).resolves.toMatchObject({
                isSuccessful: false,
                errors: [/Error: I do not like Apples!/i],
                warnings: [
                    /PipelineExecutionError: Parameter `{bhing}` should be an output parameter, but it was not generated/i,
                ],
            });

            await expect(() => pipelineExecutor({ thing }).asPromise({ isCrashedOnError: true })).rejects.toThrowError(
                /I do not like Apples!/i,
            );
        }
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
            if(/Apple/i.test(thing)){
                throw new Error('I do not like Apples!');
            }
            return thing.split('a').join('b')
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
