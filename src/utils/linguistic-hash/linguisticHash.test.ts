import {
    DEFAULT_LINGUISTIC_HASH_LANGUAGE,
    DEFAULT_LINGUISTIC_HASH_WORD_COUNT,
    linguisticHash,
    normalizeLinguisticHashLanguage,
} from './linguisticHash';

describe('linguisticHash', () => {
    it('should return the default number of words', async () => {
        const hash = await linguisticHash('test');
        expect(hash.split(' ').length).toBe(DEFAULT_LINGUISTIC_HASH_WORD_COUNT);
    });

    it('should be deterministic', async () => {
        const input = 'Promptbook is awesome!';
        const hash1 = await linguisticHash(input);
        const hash2 = await linguisticHash(input);
        expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', async () => {
        const hash1 = await linguisticHash(
            'A very long string that should definitely produce a different hash than the other one',
        );
        const hash2 = await linguisticHash('Another completely different string with different length and characters');
        expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', async () => {
        const hash = await linguisticHash('');
        expect(hash).toBeDefined();
        expect(hash.split(' ').length).toBe(DEFAULT_LINGUISTIC_HASH_WORD_COUNT);
    });

    it('should have the first character capitalized and the rest lowercase', async () => {
        const hash = await linguisticHash('some input');
        expect(hash[0]).toBe(hash[0]!.toUpperCase());
        expect(hash.substring(1)).toBe(hash.substring(1).toLowerCase());
    });

    it('should return the requested word count', async () => {
        const hash = await linguisticHash('test', 3);
        expect(hash.split(' ').length).toBe(3);
    });

    it('should keep the same prefix when word count increases', async () => {
        const shortHash = await linguisticHash('test', 7);
        const longHash = await linguisticHash('test', 8);
        const shortWords = shortHash.split(' ');
        const longWords = longHash.split(' ');
        expect(longWords.slice(0, shortWords.length)).toEqual(shortWords);
    });

    it('should use the same noun for one and two word hashes', async () => {
        const oneWordHash = await linguisticHash('test', 1);
        const twoWordHash = await linguisticHash('test', 2);
        const twoWordParts = twoWordHash.split(' ');
        expect(oneWordHash.split(' ').length).toBe(1);
        expect(twoWordParts).toHaveLength(2);
        expect(oneWordHash.toLowerCase()).toBe(twoWordParts[1]);
    });

    it('should normalize language codes', () => {
        expect(normalizeLinguisticHashLanguage('cs')).toBe('cs');
        expect(normalizeLinguisticHashLanguage('CS')).toBe('cs');
        expect(normalizeLinguisticHashLanguage('unknown')).toBe(DEFAULT_LINGUISTIC_HASH_LANGUAGE);
    });

    it('should support Czech output', async () => {
        const hash = await linguisticHash('test', 4, 'cs');
        expect(hash.split(' ').length).toBe(4);
    });
});
