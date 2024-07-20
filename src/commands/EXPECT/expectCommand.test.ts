import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { expectCommandParser } from './expectCommandParser';

describe('how EXPECT command in .ptbk.md files works', () => {
    it('should parse EXPECT command', () => {
        expect(parseCommand('Expect exactly 1 character')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 1 char')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect mininimum 1 character')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MINIMUM',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect minimally 1 character')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MINIMUM',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect min 1 char')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MINIMUM',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect maximum 5 character')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MAXIMUM',
            unit: 'CHARACTERS',
            amount: 5,
        });

        expect(parseCommand('Expect maximally 5 characters')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MAXIMUM',
            unit: 'CHARACTERS',
            amount: 5,
        });

        expect(parseCommand('Expect max 5 CHARs')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MAXIMUM',
            unit: 'CHARACTERS',
            amount: 5,
        });

        expect(parseCommand('Expect exact 1 word')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 1 word')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('Expect eXactly 1 word')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('EXPECT EXACTLY 1 WORD')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 words')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 2,
        });

        expect(parseCommand('Expect exactly 1 sentence')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'SENTENCES',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 sentences')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'SENTENCES',
            amount: 2,
        });

        expect(parseCommand('Expect exactly 0 sentences')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'SENTENCES',
            amount: 0,
        });

        expect(parseCommand('Expect exactly 1 paragraph')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'PARAGRAPHS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 paragraphs')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'PARAGRAPHS',
            amount: 2,
        });

        expect(parseCommand('Expect exactly 1 line')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'LINES',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 lines')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'LINES',
            amount: 2,
        });

        // TODO: Add page test

        expect(parseCommand('Expect JSON')).toEqual({
            type: 'EXPECT_FORMAT',
            format: 'JSON',
        });

        // [🥤] - Test here relative and absolute schema reference
    });

    it('should fail parsing expect command', () => {
        expect(() => parseCommand('Expect foo 1 char')).toThrowError(/Invalid EXPECT command/i);
        expect(() => parseCommand('Expect min 1 vars')).toThrowError(/Invalid EXPECT command/i);
        expect(() => parseCommand('Expect min chars')).toThrowError(/Invalid EXPECT command/i);
        expect(() => parseCommand('Expect min xx chars')).toThrowError(/Invalid EXPECT command/i);
        expect(() => parseCommand('Expect exactly 2 p')).toThrowError(/Ambiguous unit "p"/i);
        expect(() => parseCommand('Expect PNG')).toThrowError(/Invalid EXPECT command/i);
        expect(() => parseCommand('EXPECT')).toThrowError(/Invalid EXPECT command/i);
        expect(() => parseCommand('EXPECT brr')).toThrowError(/Invalid EXPECT command/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of expectCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
