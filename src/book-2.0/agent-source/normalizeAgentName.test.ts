import { describe, expect, it } from '@jest/globals';
import { normalizeAgentName } from './normalizeAgentName';

describe('how `normalizeAgentName` works', () => {
    it('should work with simple English names', () => {
        expect(normalizeAgentName(`John Smith`)).toBe(`john-smith`);
        expect(normalizeAgentName(`Adam Smith`)).toBe(`adam-smith`);
    });

    it('should work with simple Czech names', () => {
        expect(normalizeAgentName(`Jan Novák`)).toBe(`jan-novak`);
        expect(normalizeAgentName(`Pavol Hejný`)).toBe(`pavol-hejny`);
        expect(normalizeAgentName(`Jiří Jahn`)).toBe(`jiri-jahn`);
    });

    /*
    TODO: This should work, reflect same logic to `titleToName`
    it('should work with simple Cyrillic names', () => {
        expect(normalizeAgentName(`Павел Иванов`)).toBe(`pavel-ivanov`);
    });
    */
});
