import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { CallbackInterfaceTools } from '../../knowledge/dialogs/callback/CallbackInterfaceTools';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../types/PipelineString';
import { countCharacters } from '../../utils/expectation-counters/countCharacters';
import { countWords } from '../../utils/expectation-counters/countWords';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + custom function with dependencies', () => {
    it('should use custom postprocessing function', async () => {
        const pipelineExecutor = await getPipelineExecutor();

        expect(pipelineExecutor({ yourName: 'Matthew' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Matthew the Evangelist (28 characters, 4 words)',
            },
        });

        expect(pipelineExecutor({ yourName: 'Mark' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Mark the Evangelist (25 characters, 4 words)',
            },
        });

        expect(pipelineExecutor({ yourName: 'Luke' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Luke the Evangelist (25 characters, 4 words)',
            },
        });

        expect(pipelineExecutor({ yourName: 'John' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello John the Evangelist (25 characters, 4 words)',
            },
        });
    });
});

async function getPipelineExecutor() {
    const pipeline = await pipelineStringToJson(
        spaceTrim(`
            # Custom functions

            Show how to use custom postprocessing functions with dependencies

            -   PROMPTBOOK VERSION 1.0.0
            -   INPUT  PARAMETER {yourName} Name of the hero
            -   OUTPUT PARAMETER {greeting}

            ## Question

            -   SIMPLE TEMPLATE
            -   POSTPROCESSING addHello
            -   POSTPROCESSING withStatistics

            \`\`\`markdown
            {yourName} the Evangelist
            \`\`\`

            -> {greeting}
       `) as PipelineString,
    );

    return createPipelineExecutor({
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
                            addHello(value) {
                                return `Hello ${value}`;
                            },
                            withStatistics(value) {
                                // Note: Testing custom function with dependencies
                                return value + ` (${countCharacters(value)} characters, ${countWords(value)} words)`;
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
}
