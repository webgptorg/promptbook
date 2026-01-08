import { linguisticHash } from './linguisticHash';

describe('linguisticHash', () => {
    it('should return a string with three words', async () => {
        const hash = await linguisticHash('test');
        expect(hash.split(' ')).toHaveLength(3);
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
        expect(hash.split(' ')).toHaveLength(3);
    });

    it('should have the first word capitalized and others lowercase', async () => {
        const hash = await linguisticHash('some input');
        const words = hash.split(' ');

        // First word should be capitalized (first letter upper, rest lower)
        expect(words[0]![0]).toBe(words[0]![0]!.toUpperCase());
        expect(words[0]!.substring(1)).toBe(words[0]!.substring(1).toLowerCase());

        // Other words should be lowercase
        expect(words[1]).toBe(words[1]!.toLowerCase());
        expect(words[2]).toBe(words[2]!.toLowerCase());
    });
});
