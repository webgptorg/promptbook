import { CLAIM, NAME } from '../../../../config';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../version';

/**
 * Promptbook branding metadata embedded into standalone chat exports.
 */
type PromptbookExportBranding = {
    readonly productName: string;
    readonly creatorTool: string;
    readonly metadataSummary: string;
    readonly keywords: ReadonlyArray<string>;
    readonly commentLines: ReadonlyArray<string>;
    readonly detailLines: ReadonlyArray<string>;
};

/**
 * Builds shared Promptbook export branding for standalone save formats.
 *
 * @private internal utility of chat save format definitions
 */
export function getPromptbookExportBranding(): PromptbookExportBranding {
    const detailLines = [
        `Promptbook engine version ${PROMPTBOOK_ENGINE_VERSION}`,
        `Book language version ${BOOK_LANGUAGE_VERSION}`,
    ];

    return {
        productName: NAME,
        creatorTool: `${NAME} ${PROMPTBOOK_ENGINE_VERSION}`,
        metadataSummary: `${CLAIM}. Exported with ${NAME}.`,
        keywords: [NAME, 'chat export', 'AI agents', 'Book language'],
        commentLines: [`Exported with ${NAME}.`, ...detailLines],
        detailLines,
    };
}
