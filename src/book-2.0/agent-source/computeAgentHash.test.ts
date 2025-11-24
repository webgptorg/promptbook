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
        ).toBe('5c029a4a720f7d821673d560888c1ee58f528b66526436711ab9fd0e03a6f69d'));
});
