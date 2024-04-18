import { describe, expect, it } from '@jest/globals';
import type { Expectations } from '../../../../types/PromptbookJson/PromptTemplateJson';
import { checkExpectations } from '../../../utils/checkExpectations';
import { $fakeTextToExpectations } from './fakeTextToExpectations';

describe('how $fakeTextToExpectations works', () => {
    it('should fake the text with characters expectation', () => {
        expect(() => {
            const expectations = { characters: { min: 10, max: 50 } } satisfies Expectations;
            const text = $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow();
    });

    it('should fake the text with words expectation', () => {
        expect(() => {
            const expectations = { words: { min: 1, max: 5 } } satisfies Expectations;
            const text = $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow();
    });

    it('should fake the text with sentences expectation', () => {
        expect(() => {
            const expectations = { sentences: { min: 1, max: 5 } } satisfies Expectations;
            const text = $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow();
    });

    it('should fake the text with paragraphs expectation', () => {
        expect(() => {
            const expectations = { paragraphs: { min: 1, max: 5 } } satisfies Expectations;
            const text = $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow();
    });

    it('should fake the text with both characters, words and sentences expectation', () => {
        expect(() => {
            const expectations = {
                characters: { min: 10, max: 500 },
                words: { min: 1, max: 5 },
                sentences: { min: 1, max: 5 },
            } satisfies Expectations;
            const text = $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow();
    });
});
