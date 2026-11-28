import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../pipeline/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + missing custom function', () => {
    async function getPipelineExecutor() {
        const pipeline = await compilePipeline(
            spaceTrim(`
                # Custom functions

                Show how to use custom postprocessing functions

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
                            addHelloWithTypo(value: string): string {
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

    it('should throw error when custom postprocessing function does not exist', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        expect(() =>
            pipelineExecutor({ yourName: 'Matthew' }).asPromise({ isCrashedOnError: true }),
        ).rejects.toThrowError(/Function addHello\(\) is not defined/);
    });
});
