import { describe, expect, it } from '@jest/globals';
import { book } from '../../_packages/core.index';
import { computeAgentHash } from './computeAgentHash';

describe('how `computeAgentHash` works', () => {
    it('should work with foo', () =>
        expect(
            computeAgentHash(
                book`
                    AI Agent

                    PERSONA Foo
                    RULE Be exact
                `,
            ),
        ).toBe('a78d9fa43f915ece9fb0b59c3f22a469cc5303d68f3c41b34281877853859cd5'));
});
