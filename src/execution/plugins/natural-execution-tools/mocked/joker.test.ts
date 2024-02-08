import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
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

            ## 💬 Question

            -   JOKER {yourName}
            -   EXPECT MIN 2 WORDS

            \`\`\`markdown
            Write some name for {yourName}
            \`\`\`

            -> {name}
         `) as PromptTemplatePipelineString,
    );
    const ptp = ptbJson;
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
        expect(ptpExecutor({ yourName: 'Good name' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                yourName: 'Good name',
                name: 'Good name',
            },
        });
    });

    it('should work when joker is NOT used', () => {
        expect(ptpExecutor({ yourName: 'Badname' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                yourName: 'Badname',
                name: spaceTrim(`
                    You said:
                    Write some name for Badname
                `),
            },
        });
    });
});

/**
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPtpExecutor.test.ts"
 */
