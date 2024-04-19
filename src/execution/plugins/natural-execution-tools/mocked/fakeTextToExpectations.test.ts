import { describe, expect, it } from '@jest/globals';
import type { Expectations } from '../../../../types/PromptbookJson/PromptTemplateJson';
import { checkExpectations } from '../../../utils/checkExpectations';
import { $fakeTextToExpectations } from './fakeTextToExpectations';

describe('how $fakeTextToExpectations works', () => {
    it('should fake the text with characters expectation', () =>
        expect(async () => {
            const expectations = { characters: { min: 10, max: 50 } } satisfies Expectations;
            const text = await $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow());

    it('should fake the text with words expectation', () =>
        expect(async () => {
            const expectations = { words: { min: 1, max: 5 } } satisfies Expectations;
            const text = await $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow());

    it('should fake the text with sentences expectation', () =>
        expect(async () => {
            const expectations = { sentences: { min: 1, max: 5 } } satisfies Expectations;
            const text = await $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow());

    it('should fake the text with paragraphs expectation', () =>
        expect(async () => {
            const expectations = { paragraphs: { min: 1, max: 5 } } satisfies Expectations;
            const text = await $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow());

    it('should fake the text with lines expectation', () =>
        expect(async () => {
            const expectations = { lines: { min: 2 } } satisfies Expectations;
            const text = await $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow());

    it('should fake the text with pages expectation', () =>
        expect(async () => {
            const expectations = { pages: { min: 2 } } satisfies Expectations;
            const text = await $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow());

    it('should fake the text with both characters, words and sentences expectation', () =>
        expect(async () => {
            const expectations = {
                characters: { min: 10, max: 500 },
                words: { min: 1, max: 5 },
                sentences: { min: 1, max: 5 },
            } satisfies Expectations;
            const text = await $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow());

    it('should fake the text with both words and lines expectation', () =>
        expect(async () => {
            const expectations = {
                words: {
                    min: 10,
                },
                lines: {
                    min: 3,
                },
            } satisfies Expectations;
            const text = await $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).not.toThrow());

    /*
    TODO:
    it('should fail on contradictory expectations', () =>
        expect(async () => {
            const expectations = {
                words: {
                    max: 1,
                },
                sentences: {
                    min: 3,
                },
            } satisfies Expectations;
            const text = await $fakeTextToExpectations(expectations);
            checkExpectations(expectations, text);
        }).toThrowError(/xxx/));
    */
});
