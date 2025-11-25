import { describe, expect, it } from '@jest/globals';
import { computeHash } from './computeHash';

describe('how `computeAgentHash` works', () => {
    it('should work with multiline text', () =>
        expect(
            computeHash(`
                Some text
                to compute hash on.
            `),
        ).toBe('7b94435c5d2155a841a6b23b269c5f6872392eafadd746f4985f7670f0aae443'));

    // TODO: Test more things like JSON objects, numbers, files, etc.
});
