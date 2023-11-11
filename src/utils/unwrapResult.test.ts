import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { just } from './just';
import { unwrapResult } from './unwrapResult';

describe('unwrapResult', () => {
    it('should preserve unquoted string', () => {
        expect(unwrapResult('Hello')).toBe('Hello');
    });

    it('should remove single quotes', () => {
        expect(unwrapResult("'Hello'")).toBe('Hello');
    });

    it('should remove double quotes', () => {
        expect(unwrapResult('"Hello"')).toBe('Hello');
    });

    it('should remove backtick quotes', () => {
        expect(unwrapResult('`Hello`')).toBe('Hello');
    });

    it('should remove czech quotes', () => {
        expect(unwrapResult('„Hello“')).toBe('Hello');
    });

    it('should remove spanish quotes', () => {
        expect(unwrapResult('«Hello»')).toBe('Hello');
    });

    it('should remove quotes on untrimmed string', () => {
        expect(unwrapResult('    "Hello"    ')).toBe('Hello');
        expect(unwrapResult('   \n\n "Hello"\n    ')).toBe('Hello');
    });

    it('should remove bold and italic', () => {
        expect(unwrapResult('*Hello*')).toBe('Hello');
        expect(unwrapResult('**Hello**')).toBe('Hello');
        expect(unwrapResult('_Hello_')).toBe('Hello');
        expect(unwrapResult('__Hello__')).toBe('Hello');
    });

    it('should remove combination of quotes and bold/italix', () => {
        expect(unwrapResult('**"Hello"**')).toBe('Hello');
        expect(unwrapResult('*"Hello"*')).toBe('Hello');
        expect(unwrapResult('__"Hello"__')).toBe('Hello');
        expect(unwrapResult('_"Hello"_')).toBe('Hello');
        expect(unwrapResult('**"Hello"**')).toBe('Hello');
        expect(unwrapResult('*"Hello"*')).toBe('Hello');
        expect(unwrapResult('__"Hello"__')).toBe('Hello');
        expect(unwrapResult('_"Hello"_')).toBe('Hello');
    });

    it('should remove combination of untrimmed string with quotes and bold/italix', () => {
        expect(unwrapResult('  **"Hello"**  ')).toBe('Hello');
        expect(unwrapResult('  *"Hello"*  ')).toBe('Hello');
        expect(unwrapResult('  __"Hello"__  ')).toBe('Hello');
        expect(unwrapResult('  _"Hello"_  ')).toBe('Hello');
        expect(unwrapResult('  **"Hello"**  ')).toBe('Hello');
        expect(unwrapResult('  *"Hello"*  ')).toBe('Hello');
        expect(unwrapResult('  __"Hello"__  ')).toBe('Hello');
        expect(unwrapResult('  _"Hello"_  ')).toBe('Hello');
        expect(unwrapResult('\n\n  _"Hello"_  ')).toBe('Hello');
    });

    it('should remove quotes with leading sentence', () => {
        expect(unwrapResult('Návrh názvu: "Kreativní Dětský Svět"')).toBe('Kreativní Dětský Svět');
        expect(unwrapResult("Návrh názvu: 'Kreativní Dětský Svět'")).toBe('Kreativní Dětský Svět');
    });

    it('should remove quotes with leading newline sentence', () => {
        expect(
            unwrapResult(
                spaceTrim(`
                    Návrh názvu:

                    "Kreativní Dětský Svět"
                `),
            ),
        ).toBe('Kreativní Dětský Svět');
    });

    it('should NOT remove quotes with more leading sentences and structure', () => {
        expect(
            unwrapResult(
                spaceTrim(`
                    Návrh názvu:

                    "Kreativní Dětský Svět"
                    "Kreativní Svět Dětí"
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Návrh názvu:

                    "Kreativní Dětský Svět"
                    "Kreativní Svět Dětí"
                `),
            ),
        );
    });

    it('should NOT remove single quote from the beginning', () => {
        expect(unwrapResult("'Hello")).toBe("'Hello");
        expect(unwrapResult('"Hello')).toBe('"Hello');
    });

    it('should NOT remove single quote from the end', () => {
        expect(unwrapResult("Hello'")).toBe("Hello'");
        expect(unwrapResult('Hello"')).toBe('Hello"');
    });

    it('should NOT remove quote from the middle', () => {
        expect(unwrapResult("Hel'lo")).toBe("Hel'lo");
        expect(unwrapResult('Hel"lo')).toBe('Hel"lo');
    });

    it('should NOT remove quotes in quotes', () => {
        expect(unwrapResult(`"My name is 'Pavol'"`)).toBe(`My name is 'Pavol'`);
        expect(unwrapResult(`\n\n"My name is 'Pavol'"`)).toBe(`My name is 'Pavol'`);
    });
});
