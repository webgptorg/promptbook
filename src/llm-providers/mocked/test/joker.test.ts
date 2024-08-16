import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../../conversion/pipelineStringToJson';
import { createPipelineExecutor } from '../../../execution/createPipelineExecutor';
import { CallbackInterfaceTools } from '../../../knowledge/dialogs/callback/CallbackInterfaceTools';
import type { PipelineString } from '../../../types/PipelineString';
import { MockedEchoLlmExecutionTools } from '../MockedEchoLlmExecutionTools';

describe('createPipelineExecutor + MockedEchoExecutionTools with sample chat prompt', () => {
    it('should work when joker is used', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        expect(pipelineExecutor({ yourName: 'Good name' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                name: 'Good name',
            },
        });
    });

    it('should work when joker is NOT used', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        expect(pipelineExecutor({ yourName: 'Badname' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                name: spaceTrim(`
                    You said:
                    Write some name for Badname
                `),
            },
        });
    });
});

async function getPipelineExecutor() {
    const pipeline = await pipelineStringToJson(
        spaceTrim(`
            # ✨ Sample: Jokers

            -   MODEL VARIANT Chat
            -   MODEL NAME gpt-3.5-turbo
            -   INPUT  PARAMETER {yourName} Name of the hero or nothing
            -   OUTPUT PARAMETER {name}

            ## 💬 Question

            -   JOKER {yourName}
            -   EXPECT MIN 2 WORDS

            \`\`\`markdown
            Write some name for {yourName}
            \`\`\`

            -> {name}
       `) as PipelineString,
    );
    return createPipelineExecutor({
        pipeline,
        tools: {
            llm: new MockedEchoLlmExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                { isVerbose: true },
            ),
            script: [],
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

/**
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPipelineExecutor.test.ts"
 */
