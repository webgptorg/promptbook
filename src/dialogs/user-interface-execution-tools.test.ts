import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../conversion/compilePipeline';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../pipeline/PipelineString';
import { CallbackInterfaceTools } from './callback/CallbackInterfaceTools';

describe('createPipelineExecutor + executing user interface prompts in promptbook', () => {
    it('should work when every INPUT PARAMETER defined', async () => {
        const pipelineExecutor = await getPipelineExecutor();

        expect(pipelineExecutor({ thing: 'apple' }).asPromise()).resolves.toMatchObject({
            outputParameters: {
                favoriteThing: 'Answer to question "Thing: What is your favorite apple to buy?" is not apple but Pear.',
            },
        });
        expect(pipelineExecutor({ thing: 'a cup of coffee' }).asPromise()).resolves.toMatchObject({
            outputParameters: {
                favoriteThing:
                    'Answer to question "Thing: What is your favorite a cup of coffee to buy?" is not a cup of coffee but Pear.',
            },
        });
    });

    it('should fail when some INPUT PARAMETER is missing', async () => {
        const pipelineExecutor = await getPipelineExecutor();

        expect(pipelineExecutor({}).asPromise()).resolves.toMatchObject({
            isSuccessful: false,
            errors: [/Parameter `{thing}` is required as an input parameter/i],
        });

        expect(() => pipelineExecutor({}).asPromise()).rejects.toThrowError(
            /Parameter `\{thing\}` is required as an input parameter/i,
        );
    });
});

async function getPipelineExecutor() {
    const pipeline = await compilePipeline(
        spaceTrim(`
            # Example prompt

            Show how to use prompt dialog

            -   PROMPTBOOK VERSION 1.0.0
            -   INPUT  PARAMETER {thing} Any thing to buy
            -   OUTPUT PARAMETER {favoriteThing}

            ## Thing

            -   DIALOG

            What is your favorite {thing} to buy?

            \`\`\`text
            {thing}
            \`\`\`

            -> {favoriteThing}
      `) as PipelineString,
        // <- TODO: [📼] Use`book\`` string literal notation
    );
    const pipelineExecutor = createPipelineExecutor({
        pipeline,
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
    });

    return pipelineExecutor;
}
