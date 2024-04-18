import { LoremIpsum } from 'lorem-ipsum';
import spaceTrim from 'spacetrim';
import { LOOP_LIMIT } from '../../../../config';
import type { Expectations } from '../../../../types/PromptbookJson/PromptTemplateJson';
import { isPassingExpectations } from '../../../utils/checkExpectations';

/**
 * Gets the expectations and creates a fake text that meets the expectations
 *
 * @private internal util for MockedFackedNaturalExecutionTools
 */
export function $fakeTextToExpectations(expectations: Expectations): string {
    const lorem = new LoremIpsum({});
    let loremText = '';

    let text = '';

    for (let loopLimit = LOOP_LIMIT; loopLimit-- > 0; ) {
        if (isPassingExpectations(expectations, text)) {
            return text;
        }

        if (loremText === '') {
            loremText = lorem.generateParagraphs(2);
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

            `,
        ),
    );
}

/**
 * TODO: Implement better
 * TODO: [💝] Unite object for expecting amount and format - use here also a format
 */
