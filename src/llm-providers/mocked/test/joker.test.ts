import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { PipelineString } from '../../../pipeline/PipelineString';
import { MockedEchoLlmExecutionTools } from '../MockedEchoLlmExecutionTools';

describe('createPipelineExecutor + MockedEchoExecutionTools with example chat prompt', () => {
    it('should work when joker is used', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        await expect(
            pipelineExecutor({ yourName: 'Good name' }).asPromise({ isCrashedOnError: true }),
        ).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                name: 'Good name',
            },
        });
    });

    it('should work when joker is NOT used', async () => {
        const pipelineExecutor = await getPipelineExecutor();
        expect(pipelineExecutor({ yourName: 'Badname' }).asPromise({ isCrashedOnError: true })).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                name: expect.stringContaining(
                    spaceTrim(`
                    You said:
                    „Write some name for Badname“
                `),
                ),
            },
        });
    });
});

/**
 * Gets pipeline executor.
 */
async function getPipelineExecutor() {
    const pipeline = await compilePipeline(
        spaceTrim(`
            # ✨ Example: Jokers

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
        // <- TODO: [📼] Use`book\`` string literal notation
    );
    return createPipelineExecutor({
        pipeline,
        tools: {
            llm: new MockedEchoLlmExecutionTools({ isVerbose: true }),
            script: [],
            userInterface: new CallbackInterfaceTools({
                isVerbose: true,
                async callback() {
                    return 'Hello';
                },
            }),
        },
    });
}

// TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPipelineExecutor.test.ts"
