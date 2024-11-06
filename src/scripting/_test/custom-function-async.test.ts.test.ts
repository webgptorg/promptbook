import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { CallbackInterfaceTools } from '../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../types/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + custom async function ', () => {
    it('should use custom postprocessing function', () => {
        expect(
            getPipelineExecutor().then((pipelineExecutor) => pipelineExecutor({ yourName: 'Matthew' }, () => {})),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Matthew the Evangelist',
            },
        });

        expect(
            getPipelineExecutor().then((pipelineExecutor) => pipelineExecutor({ yourName: 'Mark' }, () => {})),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Mark the Evangelist',
            },
        });

        expect(
            getPipelineExecutor().then((pipelineExecutor) => pipelineExecutor({ yourName: 'Luke' }, () => {})),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Luke the Evangelist',
            },
        });

        expect(
            getPipelineExecutor().then((pipelineExecutor) => pipelineExecutor({ yourName: 'John' }, () => {})),
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
    const pipeline = await pipelineStringToJson(
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
                        async addHello(value) {
                            await forTime(1000);
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
