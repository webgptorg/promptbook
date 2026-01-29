import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
import { compilePipeline } from '../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../pipeline/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + custom async function ', () => {
    it('should use custom postprocessing function', async () => {
        await expect(
            getPipelineExecutor().then((pipelineExecutor) =>
                pipelineExecutor({ yourName: 'Matthew' }).asPromise({ isCrashedOnError: true }),
            ),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Matthew the Evangelist',
            },
        });

        await expect(
            getPipelineExecutor().then((pipelineExecutor) =>
                pipelineExecutor({ yourName: 'Mark' }).asPromise({ isCrashedOnError: true }),
            ),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Mark the Evangelist',
            },
        });

        await expect(
            getPipelineExecutor().then((pipelineExecutor) =>
                pipelineExecutor({ yourName: 'Luke' }).asPromise({ isCrashedOnError: true }),
            ),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Luke the Evangelist',
            },
        });

        await expect(
            getPipelineExecutor().then((pipelineExecutor) =>
                pipelineExecutor({ yourName: 'John' }).asPromise({ isCrashedOnError: true }),
            ),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello John the Evangelist',
            },
        });
    });
});

async function getPipelineExecutor() {
    const pipeline = await compilePipeline(
        spaceTrim(`
            # Custom functions

            Show how to use custom postprocessing async function

            -   PROMPTBOOK VERSION 1.0.0
            -   INPUT  PARAMETER {yourName} Name of the hero
            -   OUTPUT PARAMETER {greeting}

            ## Question

            -   SIMPLE TEMPLATE
            -   POSTPROCESSING addHello

            \`\`\`markdown
            {yourName} the Evangelist
            \`\`\`

            -> {greeting}
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

                    // Note: [🕎]
                    functions: {
                        async addHello(value: string): Promise<string> {
                            await forTime(1_000);
                            return `Hello ${value}`;
                        },
                    },
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
