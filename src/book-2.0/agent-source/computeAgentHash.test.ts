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
        ).toBe(''));
});
