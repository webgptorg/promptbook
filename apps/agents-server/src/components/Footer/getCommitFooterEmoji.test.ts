import { describe, expect, it } from '@jest/globals';
import { getCommitFooterEmoji } from './getCommitFooterEmoji';

describe('getCommitFooterEmoji', () => {
    it('returns the default heart emoji when the commit SHA is missing', () => {
        expect(getCommitFooterEmoji(undefined)).toBe('❤️');
        expect(getCommitFooterEmoji(null)).toBe('❤️');
        expect(getCommitFooterEmoji('')).toBe('❤️');
    });

    it('returns the same emoji for the same commit SHA', () => {
        const commitSha = '4c50c01a8b3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f';
        expect(getCommitFooterEmoji(commitSha)).toBe(getCommitFooterEmoji(commitSha));
    });

    it('returns different emojis for different commit SHAs', () => {
        const firstEmoji = getCommitFooterEmoji('4c50c01a8b3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f');
        const secondEmoji = getCommitFooterEmoji('be53aa944a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d');
        const thirdEmoji = getCommitFooterEmoji('eaccc17a3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b');
        expect(new Set([firstEmoji, secondEmoji, thirdEmoji]).size).toBeGreaterThan(1);
    });

    it('always returns a non-empty emoji string', () => {
        for (const commitSha of ['a', 'abc', '0', 'deadbeef', 'cafebabe', 'fedcba9876543210']) {
            const emoji = getCommitFooterEmoji(commitSha);
            expect(typeof emoji).toBe('string');
            expect(emoji.length).toBeGreaterThan(0);
        }
    });
});
