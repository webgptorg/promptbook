import { isValidCsvString } from './isValidCsvString';

describe('isValidCsvString', () => {
    it('should return true for valid CSV strings', () => {
        const validCsv = 'naohn,30,New York';
        expect(isValidCsvString(validCsv)).toBe(true);
    });

    it('should return false for strings without commas', () => {
        const noComma = 'This is just a plain text';
        expect(isValidCsvString(noComma)).toBe(false);
    });

    it('should return false for strings with invalid characters', () => {
        const invalidCsv = 'name,age,city\nJohn,30,New York\nInvalid@Row';
        expect(isValidCsvString(invalidCsv)).toBe(false);
    });

    it('should return false for empty strings', () => {
        const emptyString = '';
        expect(isValidCsvString(emptyString)).toBe(false);
    });

    it('should return false for null or undefined values', () => {
        expect(isValidCsvString(null as unknown as string)).toBe(false);
        expect(isValidCsvString(undefined as unknown as string)).toBe(false);
    });
});
