import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { createPromptbookExecutor } from '../../execution/createPromptbookExecutor';
import { CallbackInterfaceTools } from '../../knowledge/dialogs/callback/CallbackInterfaceTools';
import type { PipelineString } from '../../types/PipelineString';
import { MockedEchoLlmExecutionTools } from './MockedEchoLlmExecutionTools';

describe('createPromptbookExecutor + MockedEchoExecutionTools with sample chat prompt', () => {
    it('should work when joker is used', async () => {
        const promptbookExecutor = await getPromptbookExecutor();
        expect(promptbookExecutor({ yourName: 'Good name' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                name: 'Good name',
            },
        });
    });

    it('should work when joker is NOT used', async () => {
        const promptbookExecutor = await getPromptbookExecutor();
        expect(promptbookExecutor({ yourName: 'Badname' }, () => {})).resolves.toMatchObject({
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

async function getPromptbookExecutor() {
    const promptbook = await pipelineStringToJson(
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
    return createPromptbookExecutor({
        promptbook,
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
        settings: {
            maxExecutionAttempts: 3,
        },
    });
}

/**
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPromptbookExecutor.test.ts"
 */
