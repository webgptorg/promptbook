import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';

/**
 * Prefixes every message line so exported markdown stays scoped to one chat bubble.
 *
 * @private helper of `mdSaveFormatDefinition`
 */
function createMarkdownBlockquote(content: string): string {
    return content
        .split(/\r?\n/)
        .map((line) => (line.length === 0 ? '>' : `> ${line}`))
        .join('\n');
}

/**
 * Markdown export plugin
 *
 * @public exported from `@promptbook/components`
 */
export const mdSaveFormatDefinition = {
    formatName: 'md',
    label: 'Markdown',
    getContent: ({ messages, participants }) =>
        [
            messages
                .map((message) => {
                    const participant = participants.find((participant) => participant.name === message.sender);
                    const senderLabel = participant?.fullname?.trim() || message.sender;

                    return [`**${senderLabel}:**`, '', createMarkdownBlockquote(message.content)].join('\n');
                })
                .join('\n\n---\n\n'),
            '---',
            '_Exported from [Promptbook](https://ptbk.io)_',
        ].join('\n\n'),
    mimeType: 'text/markdown',
    fileExtension: 'md',
} as const satisfies ChatSaveFormatDefinition;
