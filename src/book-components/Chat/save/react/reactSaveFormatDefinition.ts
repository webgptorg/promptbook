import spaceTrim from 'spacetrim';
import { normalizeTo_PascalCase } from '../../../../utils/normalization/normalizeTo_PascalCase';
import { serializeToPromptbookJavascript } from '../../../../utils/serialization/serializeToPromptbookJavascript';

/**
 * React <jsx/> export plugin (full metadata)
 *
 * @public exported from `@promptbook/components`
 */
export const reactSaveFormatDefinition = {
    formatName: 'jsx',
    label: 'React',
    getContent(chatExportData) {
        const { title, messages, participants } = chatExportData;

        const componentName = normalizeTo_PascalCase(`${title} ChatComponent`);

        const { imports: participantsImports, value: participantsValue } =
            serializeToPromptbookJavascript(participants);
        const { imports: messagesImports, value: messagesValue } = serializeToPromptbookJavascript(messages);

        const uniqueImports = Array.from(
            new Set([`import { Chat } from '@promptbook/components';`, ...participantsImports, ...messagesImports]),
        ).filter((imp) => !!imp && imp.trim().length > 0);

        return spaceTrim(
            (block) => `
                "use client";

                ${block(uniqueImports.join('\n'))}

                export function ${componentName}() {
                    return(
                      <Chat
                        title="${title.replace(/"/g, '&quot;')}"
                        participants={
                            ${block(participantsValue)}
                        }
                        messages={
                            ${block(messagesValue)}
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
