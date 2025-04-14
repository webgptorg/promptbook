import { isValidXmlString } from './isValidXmlString';

describe('isValidXmlString', () => {
    it('should return true for valid XML strings', () => {
        const validXml = '<root><child>Content</child></root>';
        expect(isValidXmlString(validXml)).toBe(true);
    });

    it('should return false for invalid XML strings', () => {
        const invalidXml = '<root><child>Content</child>';
        expect(isValidXmlString(invalidXml)).toBe(false);
    });

    it('should return false for non-XML strings', () => {
        const nonXml = 'Just a plain text string';
        expect(isValidXmlString(nonXml)).toBe(false);
    });

    it('should return false for empty strings', () => {
        const emptyString = '';
        expect(isValidXmlString(emptyString)).toBe(false);
    });

    it('should return false for null or undefined values', () => {
        expect(isValidXmlString(null as unknown as string)).toBe(false);
        expect(isValidXmlString(undefined as unknown as string)).toBe(false);
    });
});
