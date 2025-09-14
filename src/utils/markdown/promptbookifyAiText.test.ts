import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../organization/just';
import { promptbookifyAiText } from './promptbookifyAiText';

describe('how `promptbookifyAiText` works', () => {
    it('should work with foo', () =>
        expect(
            promptbookifyAiText(
                spaceTrim(`
                    This is some regular text.

                    It can be humanized or not.

                    But we will mark it is Promptbookified.

                    This Promptbookification does not raise red flags for AI text detectors.
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    This is some  regular text.

                    It can be  humanized or not.

                    But we  will mark it is Promptbookified.

                    This Promptbookification does not  raise red flags for AI text detectors.
                `),
            ),
        ));
});
