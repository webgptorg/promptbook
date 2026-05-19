import { spaceTrim } from 'spacetrim';
import { normalizeTo_PascalCase } from '../../../../utils/normalization/normalizeTo_PascalCase';
import { serializeToPromptbookJavascript } from '../../../../utils/serialization/serializeToPromptbookJavascript';
import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';
import { getPromptbookExportBranding } from '../_common/getPromptbookExportBranding';

/**
 * Lightweight Promptbook branding comment embedded into exported React chats.
 *
 * @private Internal constant for `reactSaveFormatDefinition`.
 */
const PROMPTBOOK_REACT_EXPORT_BRANDING_COMMENT = createPromptbookReactExportBrandingComment();

/**
 * Builds a small branding comment for exported React chats.
 *
 * @private Internal helper of `reactSaveFormatDefinition`.
 */
function createPromptbookReactExportBrandingComment(): string {
    const branding = getPromptbookExportBranding();

    return ['/*', ...branding.commentLines.map((line) => ` * ${line}`), ' */'].join('\n');
}

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
        const { imports: titleImports, value: titleValue } = serializeToPromptbookJavascript(title);
        const { imports: participantsImports, value: participantsValue } =
            serializeToPromptbookJavascript(participants);
        const { imports: messagesImports, value: messagesValue } = serializeToPromptbookJavascript(messages);

        const uniqueImports = Array.from(
            new Set([
                `import { Chat } from '@promptbook/components';`,
                ...titleImports,
                ...participantsImports,
                ...messagesImports,
            ]),
        ).filter((imp) => !!imp && imp.trim().length > 0);

        return spaceTrim(
            (block) => `
                ${PROMPTBOOK_REACT_EXPORT_BRANDING_COMMENT}

                "use client";

                ${block(uniqueImports.join('\n'))}

                export function ${componentName}() {
                    return(
                      <Chat
                        title={
                            ${block(titleValue)}
                        }
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
