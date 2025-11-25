import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../organization/just';
import { promptbookifyAiText } from './promptbookifyAiText';

describe('how `promptbookifyAiText` works', () => {
    it('should work with multiline text', () =>
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
                    This is  some regular text.

                    It can be   humanized or  not.

                    But we will mark it is  Promptbookified.

                    This Promptbookification does not raise red flags for AI text detectors.
                `),
            ),
        ));

    it('should be idempotent', () => {
        const originalText = spaceTrim(`
            This is some regular text.

            It can be humanized or not.

            But we will mark it is Promptbookified.

            This Promptbookification does not raise red flags for AI text detectors.
        `);

        const firstPass = promptbookifyAiText(originalText);
        const secondPass = promptbookifyAiText(firstPass);
        const thirdPass = promptbookifyAiText(secondPass);
        const thousandthPass = (() => {
            let result = thirdPass;
            for (let i = 0; i < 1_000; i++) {
                result = promptbookifyAiText(result);
            }

            return result;
        })();

        expect(firstPass).toBe(secondPass);
        expect(secondPass).toBe(thirdPass);
        expect(thirdPass).toBe(thousandthPass);
        expect(firstPass).toBe(thousandthPass);
        expect(originalText).not.toBe(firstPass);
        expect(originalText).not.toBe(secondPass);
        expect(originalText).not.toBe(thirdPass);
        expect(originalText).not.toBe(thousandthPass);
    });
});
