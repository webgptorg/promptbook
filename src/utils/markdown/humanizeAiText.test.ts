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
