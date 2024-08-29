import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { expectCommandParser } from './expectAmountCommandParser';

describe('how EXPECT_AMOUNT command in .ptbk.md files works', () => {
    it('should parse EXPECT_AMOUNT command', () => {
        expect(parseCommand('Expect exactly 1 character', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 1 char', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect mininimum 1 character', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MINIMUM',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect minimally 1 character', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MINIMUM',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect min 1 char', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MINIMUM',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect maximum 5 character', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MAXIMUM',
            unit: 'CHARACTERS',
            amount: 5,
        });

        expect(parseCommand('Expect maximally 5 characters', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MAXIMUM',
            unit: 'CHARACTERS',
            amount: 5,
        });

        expect(parseCommand('Expect max 5 CHARs', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'MAXIMUM',
            unit: 'CHARACTERS',
            amount: 5,
        });

        expect(parseCommand('Expect exact 1 word', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 1 word', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('Expect eXactly 1 word', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('EXPECT EXACTLY 1 WORD', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 words', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 2,
        });

        expect(parseCommand('Expect exactly 1 sentence', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'SENTENCES',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 sentences', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'SENTENCES',
            amount: 2,
        });

        expect(parseCommand('Expect exactly 0 sentences', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'SENTENCES',
            amount: 0,
        });

        expect(parseCommand('Expect exactly 1 paragraph', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'PARAGRAPHS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 paragraphs', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'PARAGRAPHS',
            amount: 2,
        });

        expect(parseCommand('Expect exactly 1 line', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'LINES',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 lines', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'EXPECT_AMOUNT',
            sign: 'EXACTLY',
            unit: 'LINES',
            amount: 2,
        });

        // TODO: Add page test
    });

    it('should fail parsing expect command', () => {
        expect(() => parseCommand('Expect foo 1 char', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid EXPECT_AMOUNT command/i,
        );
        expect(() => parseCommand('Expect min 1 vars', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid EXPECT_AMOUNT command/i,
        );
        expect(() => parseCommand('Expect min chars', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid EXPECT_AMOUNT command/i,
        );
        expect(() => parseCommand('Expect min xx chars', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid EXPECT_AMOUNT command/i,
        );
        expect(() => parseCommand('Expect exactly 2 p', 'PIPELINE_TEMPLATE')).toThrowError(/Ambiguous unit "p"/i);
        expect(() => parseCommand('EXPECT', 'PIPELINE_TEMPLATE')).toThrowError(/Invalid EXPECT_AMOUNT command/i);
        expect(() => parseCommand('EXPECT brr', 'PIPELINE_TEMPLATE')).toThrowError(/Invalid EXPECT_AMOUNT command/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of expectCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
