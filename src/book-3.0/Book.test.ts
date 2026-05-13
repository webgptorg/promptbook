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

    it('should parse and stringify chat messages in one thread book', () => {
        const parsedBook = Book.parse(
            book`
                AI agent

                RULE Be concise.

                MESSAGE @User
                Hello, agent!

                MESSAGE @Agent
                Hello, user!
            `,
        );

        expect(parsedBook.agentName).toBe('AI agent');
        expect(parsedBook.commitments).toEqual([
            {
                type: 'RULE',
                subject: 'Be concise.',
                content: '',
            },
        ]);
        expect(parsedBook.getMessages()).toEqual([
            {
                sender: 'USER',
                content: 'Hello, agent!',
                isComplete: true,
            },
            {
                sender: 'AGENT',
                content: 'Hello, user!',
                isComplete: true,
            },
        ]);
        expect(parsedBook.stringify()).toBe(
            'AI agent\n\nRULE Be concise.\n\nMESSAGE @User\nHello, agent!\n\nMESSAGE @Agent\nHello, user!\n',
        );
    });

    it('should work with parsing chat files without agent source header', () =>
        expect(
            Book.parse(
                book`
                    MESSAGE @User
                    Hello, agent!

                    MESSAGE @Agent
                    Hello, user!

                `,
            ).getMessages(),
        ).toEqual([
            {
                sender: 'USER',
                content: 'Hello, agent!',
                isComplete: true,
            },
            {
                sender: 'AGENT',
                content: 'Hello, user!',
                isComplete: true,
            },
        ]));
});
