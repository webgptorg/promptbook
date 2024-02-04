import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { PromptTemplatePipeline } from '../../../../classes/PromptTemplatePipeline';
import { promptTemplatePipelineStringToJson } from '../../../../conversion/promptTemplatePipelineStringToJson';
import { PromptTemplatePipelineString } from '../../../../types/PromptTemplatePipelineString';
import { createPtpExecutor } from '../../../createPtpExecutor';
import { CallbackInterfaceTools } from '../../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { MockedEchoNaturalExecutionTools } from './MockedEchoNaturalExecutionTools';

describe('createPtpExecutor + MockedEchoExecutionTools with sample chat prompt', () => {
    const ptbJson = promptTemplatePipelineStringToJson(
        spaceTrim(`
            # ✨ Sample: Jokers

            -   INPUT  PARAMETER {yourName} Name of the hero or nothing
            -   EXPECT MIN 2 WORDS

            ## 💬 Question

            -   JOKER {yourName}

            \`\`\`markdown
            Write some name for hero
            \`\`\`

            -> {name}
         `) as PromptTemplatePipelineString,
    );
    const ptp = PromptTemplatePipeline.fromJson(ptbJson);
    const ptpExecutor = createPtpExecutor({
        ptp,
        tools: {
            natural: new MockedEchoNaturalExecutionTools({ isVerbose: true }),
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

    it('should work when joker is used', () => {
        expect(ptpExecutor({ yourName: 'Pavol Hejný' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            outputParameters: {
                yourName: 'Pavol Hejný',
                name: 'Pavol Hejný',
            },
        });
    });

    it('should work when joker is NOT used', () => {
        expect(ptpExecutor({ yourName: 'Superman' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            outputParameters: {
                yourName: 'Superman',
                name: spaceTrim(`
                    You said:
                    Superman
                `),
            },
        });
    });
});

/**
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPtpExecutor.test.ts"
 */
