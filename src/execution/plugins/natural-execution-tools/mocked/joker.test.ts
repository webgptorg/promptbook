import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { promptbookStringToJson } from '../../../../conversion/promptbookStringToJson';
import { PromptbookString } from '../../../../types/PromptbookString';
import { createPtbkExecutor } from '../../../createPtbkExecutor';
import { CallbackInterfaceTools } from '../../user-interface-execution-tools/callback/CallbackInterfaceTools';
import { MockedEchoNaturalExecutionTools } from './MockedEchoNaturalExecutionTools';

describe('createPtbkExecutor + MockedEchoExecutionTools with sample chat prompt', () => {
    const ptbJson = promptbookStringToJson(
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
         `) as PromptbookString,
    );
    const ptbk = ptbJson;
    const ptbkExecutor = createPtbkExecutor({
        ptbk,
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
        expect(ptbkExecutor({ yourName: 'Good name' }, () => {})).resolves.toMatchObject({
            isSuccessful: true,
            errors: [],
            outputParameters: {
                yourName: 'Good name',
                name: 'Good name',
            },
        });
    });

    it('should work when joker is NOT used', () => {
        expect(ptbkExecutor({ yourName: 'Badname' }, () => {})).resolves.toMatchObject({
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
 * TODO: [🧠] What should be name of this test "MockedEchoExecutionTools.test.ts" or "createPtbkExecutor.test.ts"
 */
