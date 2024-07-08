import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { assertsExecutionSuccessful } from '../../execution/assertsExecutionSuccessful';
import { createPromptbookExecutor } from '../../execution/createPromptbookExecutor';
import { CallbackInterfaceTools } from '../../knowledge/dialogs/callback/CallbackInterfaceTools';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../types/PipelineString';
import { JavascriptExecutionTools } from '../javascript/JavascriptExecutionTools';

describe('createPromptbookExecutor + missing custom function', () => {
    async function getPromptbookExecutor() {
        const promptbook = await pipelineStringToJson(
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

        const promptbookExecutor = createPromptbookExecutor({
            promptbook,
            tools: {
                llm: new MockedEchoLlmExecutionTools({ isVerbose: true }),
                script: [
                    new JavascriptExecutionTools({
                        isVerbose: true,

                        // Note: [🕎]
                        functions: {
                            addHelloWithTypo(value) {
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
            settings: {
                maxExecutionAttempts: 3,
            },
        });

        return promptbookExecutor;
    }

    it('should throw error when custom postprocessing function does not exist', async () => {
        const promptbookExecutor = await getPromptbookExecutor();
        expect(() =>
            promptbookExecutor({ yourName: 'Matthew' }, () => {}).then(assertsExecutionSuccessful),
        ).rejects.toThrowError(/Function addHello\(\) is not defined/);
    });
});
