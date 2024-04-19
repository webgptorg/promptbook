import { LoremIpsum } from 'lorem-ipsum';
import { spaceTrim } from 'spacetrim';
import { CHARACTER_LOOP_LIMIT } from '../../../../config';
import type { Expectations } from '../../../../types/PromptbookJson/PromptTemplateJson';
import { isPassingExpectations } from '../../../utils/checkExpectations';
import { PostprocessingFunction } from '../../script-execution-tools/javascript/JavascriptExecutionToolsOptions';

/**
 * Gets the expectations and creates a fake text that meets the expectations
 *
 * Note: You can provide postprocessing functions to modify the text before checking the expectations
 *       The result will be the text BEFORE the postprocessing
 *
 * @private internal util for MockedFackedNaturalExecutionTools
 */
export async function $fakeTextToExpectations(
    expectations: Expectations,
    postprocessing?: Array<PostprocessingFunction>,
): Promise<string> {
    const lorem = new LoremIpsum({
        wordsPerSentence: { min: 5, max: 15 },
        sentencesPerParagraph: { min: 5, max: 15 },
    });
    let loremText = '';
    let text = '';

    for (let loopLimit = CHARACTER_LOOP_LIMIT; loopLimit-- > 0; ) {
        let textToCheck = text;
        for (const func of postprocessing || []) {
            textToCheck = await func(textToCheck);
        }

        if (isPassingExpectations(expectations, textToCheck)) {
            return text; // <- Note: Returning the text because the postprocessing
        }

        if (loremText === '') {
            loremText = lorem.generateParagraphs(1) + '\n\n';
        }

        text += loremText.substring(0, 1);
        loremText = loremText.substring(1);
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Can not generate fake text to met the expectations

                Loop limit reached
                The expectations:
                ${block(JSON.stringify(expectations, null, 4))}

                The draft text:
                ${block(text)}

            `,
        ),
    );
}

/**
 * TODO: Implement better - create FakeLLM from this
 * TODO: [💝] Unite object for expecting amount and format - use here also a format
 */
