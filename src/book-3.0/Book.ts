import type { string_book } from '../book-2.0/agent-source/string_book';
import type { ChatMessage } from '../book-components/Chat/types/ChatMessage';
import { book } from '../pipeline/book-notation';
import { TODO_USE } from '../utils/organization/TODO_USE';

/**
 * Parser for the agent source for Promptbook agents in book language
 *
 * @public exported from `@promptbook/core`
 */
export class Book {
    static parse(source: string_book): Book {
        // TODO: Implement

        TODO_USE(/* TODO: Implement parsing logic */ source);

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
