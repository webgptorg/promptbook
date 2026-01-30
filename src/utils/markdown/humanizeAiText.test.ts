import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../organization/just';
import { humanizeAiText } from './humanizeAiText';

describe('how `humanizeAiText` works', () => {
    it('should cleanup AI text', () =>
        /* eslint-disable no-irregular-whitespace */
        expect(
            humanizeAiText(
                spaceTrim(`
                    This is an example of AI-generated text — it may contain some “smart quotes” and unprintable hard spaces.

                    Let's see how it handles ellipses… and em-dashes — as well as other characters like «guillemets» and ‚single low-9 quotes‘.
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    This is an example of AI-generated text - it may contain some "smart quotes" and unprintable hard spaces.

                    Let's see how it handles ellipses... and em-dashes - as well as other characters like "guillemets" and 'single low-9 quotes'.
                `),
            ),
        ));

    it('should normalize additional punctuation variants', () =>
        expect(
            humanizeAiText(
                spaceTrim(`
                    Here are more cases: \u201fDouble quotes\u201d and \u00abguillemets\u00bb.
                    Single quotes: \u201bHigh-9\u2019 and \u2039single\u203a.
                    Dashes: en\u2013dash, non\u2011breaking, minus\u2212sign, full width\uFF0Ddash.
                    Ellipsis: midline\u22ef and dot leader . . .
                    Spaces: 10\u202f000 with thin\u2009space and zero\u200b width.
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Here are more cases: "Double quotes" and "guillemets".
                    Single quotes: 'High-9' and 'single'.
                    Dashes: en-dash, non-breaking, minus-sign, full width-dash.
                    Ellipsis: midline... and dot leader ...
                    Spaces: 10 000 with thin space and zero width.
                `),
            ),
        ));

    it('should keep the text which is already clean', () =>
        expect(
            humanizeAiText(
                spaceTrim(`
                    This text is already clean.

                    No changes should be made.

                    ěščřžýáíéúůĚŠČŘŽÝÁÍÉÚŮ
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    This text is already clean.

                    No changes should be made.

                    ěščřžýáíéúůĚŠČŘŽÝÁÍÉÚŮ

                `),
            ),
        ));

    it('should remove source artifacts', () => {
        const sourceMarker = '\u30105:1\u2020source\u3011';
        const sourceMarkerTwo = '\u301012:4\u2020source\u3011';

        expect(
            humanizeAiText(
                spaceTrim(`
                    Example text${sourceMarker}.
                    Another line ${sourceMarkerTwo} should stay readable.
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Example text.
                    Another line should stay readable.
                `),
            ),
        );
    });

    it('should be idempotent', () => {
        const originalText = spaceTrim(`
            This is an example of AI-generated text — it may contain some “smart quotes” and unprintable hard spaces.

            Let's see how it handles ellipses… and em-dashes — as well as other characters like «guillemets» and ‚single low-9 quotes‘.
        `);

        const firstPass = humanizeAiText(originalText);
        const secondPass = humanizeAiText(firstPass);
        const thirdPass = humanizeAiText(secondPass);
        const millionthPass = (() => {
            let result = thirdPass;
            for (let i = 0; i < 1_000_000; i++) {
                result = humanizeAiText(result);
            }

            return result;
        })();

        expect(firstPass).toBe(secondPass);
        expect(secondPass).toBe(thirdPass);
        expect(thirdPass).toBe(millionthPass);
        expect(firstPass).toBe(millionthPass);
        expect(originalText).not.toBe(firstPass);
        expect(originalText).not.toBe(secondPass);
        expect(originalText).not.toBe(thirdPass);
        expect(originalText).not.toBe(millionthPass);
    });
});
