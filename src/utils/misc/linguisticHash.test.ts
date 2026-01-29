import { linguisticHash } from './linguisticHash';

describe('linguisticHash', () => {
    it('should return a sentence-like story with multiple words', async () => {
        const hash = await linguisticHash('test');
        expect(hash.split(' ').length).toBeGreaterThanOrEqual(12);
        expect(hash.endsWith('.')).toBe(true);
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
        expect(hash.split(' ').length).toBeGreaterThanOrEqual(12);
    });

    it('should have the first character capitalized and the rest lowercase', async () => {
        const hash = await linguisticHash('some input');
        expect(hash[0]).toBe(hash[0]!.toUpperCase());
        expect(hash.substring(1)).toBe(hash.substring(1).toLowerCase());
    });
});
