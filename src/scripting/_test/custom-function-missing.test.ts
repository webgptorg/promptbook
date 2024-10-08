import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { CallbackInterfaceTools } from '../../dialogs/callback/CallbackInterfaceTools';
import { assertsExecutionSuccessful } from '../../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../types/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + missing custom function', () => {
    async function getPipelineExecutor() {
        const pipeline = await pipelineStringToJson(
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
        );

        const pipelineExecutor = createPipelineExecutor({
            pipeline,
            tools: {
                llm: new MockedEchoLlmExecutionTools(
                    //            <- TODO: [🧱] Implement in a functional (not new Class) way
                    { isVerbose: true },
                ),
                script: [
                    new JavascriptExecutionTools(
                        //            <- TODO: [🧱] Implement in a functional (not new Class) way
                        {
                            isVerbose: true,

                            // Note: [🕎]
                            functions: {
                                addHelloWithTypo(value) {
                                    return `Hello ${value}`;
                                },
                            },
                        },
                    ),
                ],
                userInterface: new CallbackInterfaceTools(
                    //            <- TODO: [🧱] Implement in a functional (not new Class) way
                    {
                        isVerbose: true,
                        async callback() {
                            return 'Hello';
                        },
                    },
                ),
            },
        });

        return pipelineExecutor;
    }

    it('should throw error when custom postprocessing function does not exist', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        expect(() =>
            pipelineExecutor({ yourName: 'Matthew' }, () => {}).then(assertsExecutionSuccessful),
        ).rejects.toThrowError(/Function addHello\(\) is not defined/);
    });
});
