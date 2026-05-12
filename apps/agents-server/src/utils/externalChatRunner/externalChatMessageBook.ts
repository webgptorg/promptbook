/**
 * Creates one queued chat-message book consumed by the external runner.
 */
export function createExternalChatQueuedMessageBook(options: { messageContent: string }): string {
    return normalizeBookText(`MESSAGE @User\n${options.messageContent}`);
}

/**
 * Parses the agent answer from one finished chat-message book.
 */
export function parseExternalChatFinishedMessageBook(bookContent: string): string {
    const answerMarkerIndex = findBookCommitmentLineIndex(bookContent, 'ANSWER @Agent');

    if (answerMarkerIndex === -1) {
        return bookContent.trim();
    }

    return bookContent
        .split(/\r?\n/)
        .slice(answerMarkerIndex + 1)
        .join('\n')
        .trim();
}

/**
 * Builds a human-readable failure reason from one failed chat-message book.
 */
export function parseExternalChatFailedMessageBook(bookContent: string): string {
    const normalized = bookContent.trim();
    if (normalized.length === 0) {
        return 'External chat runner moved the message to failed.';
    }

    const parsedAnswer = parseExternalChatFinishedMessageBook(normalized);
    return parsedAnswer || normalized;
}

/**
 * Normalizes `.book` message content to LF and one trailing newline.
 */
function normalizeBookText(value: string): string {
    return `${value.replace(/\r\n/g, '\n').trimEnd()}\n`;
}

/**
 * Finds the line index of one exact commitment marker.
 */
function findBookCommitmentLineIndex(bookContent: string, marker: string): number {
    return bookContent.split(/\r?\n/).findIndex((line) => line.trim() === marker);
}
