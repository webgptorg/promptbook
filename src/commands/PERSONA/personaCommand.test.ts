import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { personaCommandParser } from './personaCommandParser';

describe('how PERSONA command in .ptbk.md files works', () => {
    it('should parse PERSONA command in PIPELINE_HEAD', () => {
        expect(parseCommand('PERSONA John', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'John',
            personaDescription: null,
        });
        expect(parseCommand('PERSONA Joe', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'Joe',
            personaDescription: null,
        });
        expect(parseCommand('PERSONA Jiří', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'Jiří',
            personaDescription: null,
        });
        expect(parseCommand('PERSONA Іван', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'Іван',
            personaDescription: null,
        });
        expect(parseCommand('PERSONA 田中', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: '田中',
            personaDescription: null,
        });
        expect(parseCommand('PERSONA محمد مصدق', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'محمد مصدق',
            personaDescription: null,
        });
    });

    it('should parse PERSONA command in PIPELINE_TEMPLATE', () => {
        expect(parseCommand('PERSONA John', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'PERSONA',
            personaName: 'John',
            personaDescription: null,
        });
    });

    it('should parse PERSONA with description', () => {
        expect(parseCommand('PERSONA John, male 38 years old programmer', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'John',
            personaDescription: 'male 38 years old programmer',
        });
        expect(parseCommand('PERSONA John; male 38 years old programmer', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'John',
            personaDescription: 'male 38 years old programmer',
        });
        expect(parseCommand('PERSONA John: male 38 years old programmer', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'John',
            personaDescription: 'male 38 years old programmer',
        });
        expect(parseCommand('PERSONA Joe, male 38 years old programmer', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'Joe',
            personaDescription: 'male 38 years old programmer',
        });
        expect(parseCommand('PERSONA Jiří, male 38 years old programmer', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'Jiří',
            personaDescription: 'male 38 years old programmer',
        });
        expect(parseCommand('PERSONA Іван, male 38 years old programmer', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'Іван',
            personaDescription: 'male 38 years old programmer',
        });
        expect(parseCommand('PERSONA 田中, male 38 years old programmer', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: '田中',
            personaDescription: 'male 38 years old programmer',
        });
        expect(parseCommand('PERSONA محمد مصدق, male 38 years old programmer', 'PIPELINE_HEAD')).toEqual({
            type: 'PERSONA',
            personaName: 'محمد مصدق',
            personaDescription: 'male 38 years old programmer',
        });
    });

    it('should fail parsing PERSONA command', () => {
        expect(() => parseCommand('PERSONA', 'PIPELINE_HEAD')).toThrowError(/You must set name for the persona/i);
        expect(() => parseCommand('PERSONA ,', 'PIPELINE_HEAD')).toThrowError(/You must set name for the persona/i);
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of personaCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
