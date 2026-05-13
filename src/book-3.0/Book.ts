import type { string_book } from '../book-2.0/agent-source/string_book';
import type { ChatMessage } from '../book-components/Chat/types/ChatMessage';

/**
 * Parser for the agent source for Promptbook agents in book language
 *
 * @public exported from `@promptbook/core`
 */
export class Book {
    static parse(source: string_book): Book {
        const normalizedSource = normalizeBookSource(source);
        const lines = normalizedSource.split('\n');
        let lineIndex = findNextNonEmptyLineIndex(lines, 0);
        let agentName = '';

        if (lineIndex !== -1 && !parseBookMessageHeader(lines[lineIndex]!.trim())) {
            agentName = lines[lineIndex]!.trim();
            lineIndex = findNextNonEmptyLineIndex(lines, lineIndex + 1);
        }

        const commitments: Array<Commitment> = [];
        const messageBlocks: Array<BookMessageBlock> = [];

        while (lineIndex !== -1) {
            const headerLine = lines[lineIndex]!.trim();
            const nextBlockLineIndex = findNextBookBlockHeaderLineIndex(lines, lineIndex + 1);
            const blockContent = normalizeBookBlockContent(lines.slice(lineIndex + 1, nextBlockLineIndex === -1 ? undefined : nextBlockLineIndex));
            const messageHeader = parseBookMessageHeader(headerLine);

            if (messageHeader) {
                messageBlocks.push({
                    ...messageHeader,
                    content: blockContent,
                });
            } else {
                const commitmentHeader = parseCommitmentHeader(headerLine);

                if (commitmentHeader) {
                    commitments.push({
                        ...commitmentHeader,
                        content: blockContent,
                    });
                }
            }

            lineIndex =
                nextBlockLineIndex === -1 ? -1 : findNextNonEmptyLineIndex(lines, nextBlockLineIndex);
        }

        return new Book(agentName, commitments, messageBlocks);
    }

    /**
     * Creates one Book from already structured message blocks.
     *
     * @public exported from `@promptbook/core`
     */
    static fromMessages(
        messages: ReadonlyArray<Pick<ChatMessage, 'content'> & { sender: string }>,
        options: {
            agentName?: string;
            commitments?: ReadonlyArray<Commitment>;
        } = {},
    ): Book {
        return new Book(
            options.agentName || '',
            options.commitments || [],
            messages.map((message) => ({
                marker: 'MESSAGE',
                sender: normalizeBookParticipantName(message.sender),
                content: normalizeBookBlockContent(message.content.split(/\r?\n/)),
            })),
        );
    }

    private constructor(
        public readonly agentName: string,
        public readonly commitments: ReadonlyArray<Commitment>,
        private readonly messageBlocks: ReadonlyArray<BookMessageBlock>,
    ) {}

    public stringify(): string_book {
        const sections: Array<string> = [];

        if (this.agentName.trim().length > 0) {
            sections.push(this.agentName.trim());
        }

        for (const commitment of this.commitments) {
            sections.push(
                [
                    [commitment.type, commitment.subject].filter(Boolean).join(' ').trim(),
                    commitment.content.trim(),
                ]
                    .filter(Boolean)
                    .join('\n'),
            );
        }

        for (const messageBlock of this.messageBlocks) {
            sections.push(
                [
                    `${messageBlock.marker} @${messageBlock.sender}`,
                    messageBlock.content.trim(),
                ]
                    .filter(Boolean)
                    .join('\n'),
            );
        }

        return `${sections.join('\n\n').trimEnd()}\n` as string_book;
    }

    public getMessages(): ReadonlyArray<ChatMessage> {
        return this.messageBlocks.map((messageBlock) => ({
            sender: normalizeChatMessageSender(messageBlock.sender),
            content: messageBlock.content,
            isComplete: true,
        }));
    }
}

type Commitment = {
    type: string;
    subject: string;
    content: string;
};

type BookMessageBlock = {
    marker: 'MESSAGE' | 'ANSWER';
    sender: string;
    content: string;
};

/**
 * Normalizes one raw Book source to LF line endings.
 *
 * @private internal utility of `Book`
 */
function normalizeBookSource(source: string): string {
    return source.replace(/\r\n/g, '\n').trim();
}

/**
 * Finds the next non-empty line index or `-1` when none exists.
 *
 * @private internal utility of `Book`
 */
function findNextNonEmptyLineIndex(lines: ReadonlyArray<string>, startIndex: number): number {
    for (let lineIndex = startIndex; lineIndex < lines.length; lineIndex++) {
        if (lines[lineIndex]!.trim().length > 0) {
            return lineIndex;
        }
    }

    return -1;
}

/**
 * Finds the next Book block header line index or `-1`.
 *
 * @private internal utility of `Book`
 */
function findNextBookBlockHeaderLineIndex(lines: ReadonlyArray<string>, startIndex: number): number {
    for (let lineIndex = startIndex; lineIndex < lines.length; lineIndex++) {
        if (isBookBlockHeader(lines[lineIndex]!)) {
            return lineIndex;
        }
    }

    return -1;
}

/**
 * Returns true when one line starts a new Book block.
 *
 * @private internal utility of `Book`
 */
function isBookBlockHeader(line: string): boolean {
    return Boolean(parseBookMessageHeader(line.trim()) || parseCommitmentHeader(line.trim()));
}

/**
 * Parses one chat-message block header.
 *
 * @private internal utility of `Book`
 */
function parseBookMessageHeader(line: string): Pick<BookMessageBlock, 'marker' | 'sender'> | null {
    const match = /^(MESSAGE|ANSWER)\s+@(.+)$/u.exec(line);
    if (!match) {
        return null;
    }

    return {
        marker: match[1] as BookMessageBlock['marker'],
        sender: normalizeBookParticipantName(match[2]!),
    };
}

/**
 * Parses one commitment header into its type and inline subject.
 *
 * @private internal utility of `Book`
 */
function parseCommitmentHeader(line: string): Commitment | null {
    const match = /^([A-Z][A-Z0-9]*(?: [A-Z0-9]+)*)(?:\s+(.*))?$/u.exec(line);
    if (!match) {
        return null;
    }

    return {
        type: match[1]!,
        subject: (match[2] || '').trim(),
        content: '',
    };
}

/**
 * Normalizes multiline Book block content while preserving internal line breaks.
 *
 * @private internal utility of `Book`
 */
function normalizeBookBlockContent(lines: ReadonlyArray<string>): string {
    return lines.join('\n').trim();
}

/**
 * Normalizes one Book participant label to a stable display form.
 *
 * @private internal utility of `Book`
 */
function normalizeBookParticipantName(sender: string): string {
    const normalizedSender = sender.trim();
    if (normalizedSender.length === 0) {
        return 'Agent';
    }

    const uppercaseSender = normalizedSender.toUpperCase();
    if (uppercaseSender === 'USER') {
        return 'User';
    }
    if (uppercaseSender === 'AGENT') {
        return 'Agent';
    }

    return normalizedSender;
}

/**
 * Maps one Book participant label to the chat sender token used by the UI types.
 *
 * @private internal utility of `Book`
 */
function normalizeChatMessageSender(sender: string): ChatMessage['sender'] {
    const uppercaseSender = sender.trim().toUpperCase();

    if (uppercaseSender === 'USER') {
        return 'USER';
    }
    if (uppercaseSender === 'AGENT') {
        return 'AGENT';
    }

    return uppercaseSender as ChatMessage['sender'];
}
