import { describe, expect, it } from '@jest/globals';
import { book } from './book-notation';
import { isValidPipelineString } from './isValidPipelineString';

describe('how `isValidPipelineString` works', () => {
    it('should work with books', () =>
        expect(
            isValidPipelineString(
                book`
                    # Book

                    Write a joke about the {topic}

                    -> {joke}
                `,
            ),
        ).toBe(true));
});

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 */
