import { Book } from '@promptbook-local/core';
import type { ChatMessage, string_book } from '@promptbook-local/types';

/**
 * Creates one queued chat-thread book consumed by the local coding-agent runner.
 */
export function createLocalChatQueuedMessageBook(options: {
    messages: ReadonlyArray<Pick<ChatMessage, 'content'> & { sender: string }>;
}): string {
    return Book.fromMessages(options.messages).stringify();
}

/**
 * Parses the agent answer from one finished chat-thread book when the expected turn is complete.
 */
export function parseLocalChatFinishedMessageBook(options: {
    bookContent: string;
    expectedMessagesBeforeAnswer: number;
}): string | null {
    const finishedMessages = Book.parse(options.bookContent as string_book).getMessages();
    const answerMessage = finishedMessages[options.expectedMessagesBeforeAnswer];

    if (!answerMessage || answerMessage.sender !== 'AGENT') {
        return null;
    }

    return answerMessage.content.trim();
}

/**
 * Builds a human-readable failure reason from one failed chat-thread book.
 */
export function parseLocalChatFailedMessageBook(options: {
    bookContent: string;
    expectedMessagesBeforeAnswer: number;
}): string | null {
    const parsedAnswer = parseLocalChatFinishedMessageBook(options);
    if (parsedAnswer) {
        return parsedAnswer;
    }

    const normalizedBookContent = options.bookContent.trim();
    if (normalizedBookContent.length === 0) {
        return 'Local agent runner moved the message to failed.';
    }

    const failedMessages = Book.parse(options.bookContent as string_book).getMessages();
    if (failedMessages.length === 0) {
        return normalizedBookContent;
    }

    if (failedMessages.length < options.expectedMessagesBeforeAnswer) {
        return null;
    }

    return 'Local agent runner moved the message to failed.';
}
