import { spaceTrim } from 'spacetrim';
import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';

/**
 * Markdown export plugin
 *
 * @public exported from `@promptbook/components`
 */
export const mdSaveFormatDefinition = {
    formatName: 'md',
    label: 'Markdown',
    getContent: ({ messages }) =>
        spaceTrim(`
            ${messages
                .map((message) =>
                    spaceTrim(`
                        **${message.sender}:**

                        > ${message.content.replace(/\n/g, '\n> ')}
                    `),
                )
                .join('\n\n---\n\n')}

            ---

            _Exported from [Promptbook](https://ptbk.io)_
        `),
    mimeType: 'text/markdown',
    fileExtension: 'md',
} as const satisfies ChatSaveFormatDefinition;
