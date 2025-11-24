import { describe, expect, it } from '@jest/globals';
import { computeHash } from './computeHash';

describe('how `computeAgentHash` works', () => {
    it('should work with foo', () =>
        expect(
            computeHash(`
                Some text
                to compute hash on.
            `),
        ).toBe('a78d9fa43f915ece9fb0b59c3f22a469cc5303d68f3c41b34281877853859cd5'));

    // TODO: Test more things like JSON objects, numbers, files, etc.
});
