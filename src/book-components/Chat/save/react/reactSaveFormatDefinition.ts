import spaceTrim from 'spacetrim';
import { normalizeTo_PascalCase } from '../../../../_packages/utils.index';
import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';

/**
 * React <jsx/> export plugin (full metadata)
 *
 * @public exported from `@promptbook/components`
 */
export const reactSaveFormatDefinition = {
    formatName: 'jsx',
    label: 'React (JavaScript)',
    getContent(chatExportData) {
        const { title, messages, participants } = chatExportData;

        const componentName = normalizeTo_PascalCase(`${title} ChatComponent`);

        const messagesJavascript = JSON.stringify(messages, null, 4);
        // <- TODO: !!!! use `Date` for dates
        // <- TODO: !!!! use spaceTrim and crop "

        const participantsJson = JSON.stringify(participants, null, 4);
        // <- TODO: !!!! use `Color.fromHex` for colors

        return spaceTrim(
            (block) => `
            "use client";

            import { Chat } from '@promptbook/components';

            export function ${componentName}() {
                return(
                  <Chat
                    title="${title.replace(/"/g, '&quot;')}"
                    participants={
                        ${block(participantsJson)}
                    }
                    messages={
                        ${block(messagesJavascript)}
                    }


                  />
                );
            }
        `,
        );
    },
    mimeType: 'application/javascript',
    fileExtension: 'jsx',
} as const satisfies ChatSaveFormatDefinition;
