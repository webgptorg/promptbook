import { LoremIpsum } from 'lorem-ipsum';
import type { Expectations } from '../../../../types/PromptbookJson/PromptTemplateJson';
import { just } from '../../../../utils/just';

/**
 * Gets the expectations and creates a fake text that meets the expectations
 *
 * @private internal util for MockedFackedNaturalExecutionTools
 */
export function $fakeTextToExpectations(expectations: Expectations): string {
    const lorem = new LoremIpsum({
        sentencesPerParagraph: {
            max: 8,
            min: 4,
        },
        wordsPerSentence: {
            max: 16,
            min: 4,
        },
    });

    just(expectations);
    // TODO: !!! Really use the expectations to generate the text

    return lorem.generateSentences(5);
}
