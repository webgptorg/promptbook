import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../pipeline/PipelineString';
import { countCharacters } from '../../utils/expectation-counters/countCharacters';
import { countWords } from '../../utils/expectation-counters/countWords';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPipelineExecutor + custom function with dependencies', () => {
    it('should use custom postprocessing function', async () => {
        const pipelineExecutor = await getPipelineExecutor();

        expect(pipelineExecutor({ yourName: 'Matthew' }).asPromise()).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Matthew the Evangelist (28 characters, 4 words)',
            },
        });

        expect(pipelineExecutor({ yourName: 'Mark' }).asPromise()).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Mark the Evangelist (25 characters, 4 words)',
            },
        });

        expect(pipelineExecutor({ yourName: 'Luke' }).asPromise()).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello Luke the Evangelist (25 characters, 4 words)',
            },
        });

        expect(pipelineExecutor({ yourName: 'John' }).asPromise()).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                greeting: 'Hello John the Evangelist (25 characters, 4 words)',
            },
        });
    });
});

async function getPipelineExecutor() {
    const pipeline = await compilePipeline(
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
        // <- TODO: [📼] Use`book\`` string literal notation
    );

    return createPipelineExecutor({
        pipeline,
        tools: {
            llm: new MockedEchoLlmExecutionTools({ isVerbose: true }),
            script: [
                new JavascriptExecutionTools({
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
}
