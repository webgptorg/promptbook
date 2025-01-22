import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { prompt } from './prompt-notation';

describe('how prompt tag function works', () => {
    it('should work with simple prompt', () =>
        expect(
            prompt`
                You are an expert in linguistics

                - Translate the following sentence into English
            `,
        ).toBe(
            spaceTrim(`
                You are an expert in linguistics

                - Translate the following sentence into English
            `),
        ));

    it('should work with interpolated string template', () =>
        expect(
            prompt`
                You are an expert in linguistics

                - Translate the following sentence into ${'English'}
            `,
        ).toBe(
            spaceTrim(`
                You are an expert in linguistics

                - Translate the following sentence into English
            `),
        ));

    it('should work with multiline interpolated string template', () =>
        expect(
            prompt`
                You are an expert in linguistics

                ${'foo\nbar'}
            `,
        ).toBe(
            spaceTrim(`
                You are an expert in linguistics
                
                foo
                bar
            `),
        ));

    it('should separate data and instructions', () =>
        expect(
            prompt`
                You are an expert in linguistics

                - ${'foo\nbar'}
            `,
        ).toBe(
            spaceTrim(`
                You are an expert in linguistics

                - foo
                - bar
            `),
        ));
});

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 */
