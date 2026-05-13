import { ChatMessage, string_book } from '../_packages/types.index';
import { book } from '../pipeline/book-notation';

/**
 * Parser for the agent source for Promptbook agents in book language
 *
 * @public exported from `@promptbook/core`
 */
export class Book {
    static parse(source: string_book): Book {
        // TODO: Implement

        return new Book('TODO', []);
    }

    private constructor(public readonly agentName: string, public readonly commitments: ReadonlyArray<Commitment>) {}

    public stringify(): string_book {
        return book`
            TODO
        `;
    }

    public getMessages(): ReadonlyArray<ChatMessage> {
        return [
            /* TODO */
        ];
    }
}

type Commitment = {
    type: string;
    subject: string;
    content: string;
};
