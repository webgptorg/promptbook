import { describe, expect, it } from '@jest/globals';
import { book } from '../pipeline/book-notation';
import { Book } from './Book';

describe('how `Book` works', () => {
    it('should parse agent source', () =>
        expect(
            Book.parse(
                book`
                    AI agent
                `,
            ).agentName,
        ).toBe('AI agent'));

    // TODO: Write tests

    it('should work with parsing chat', () =>
        expect(
            Book.parse(
                book`
                    AI agent

                    MESSAGE @User
                    Hello, agent!

                    MESSAGE @Agent
                    Hello, user!
                    
                `,
            ).getMessages(),
        ).toBe([
            // <- TODO: Maybe toMatch or other matcher with partial object match
            /* TODO */
        ]));
});
