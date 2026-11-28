import { CLAIM, NAME } from '../../../../config';
import { removeMarkdownFormatting } from '../../../../utils/markdown/removeMarkdownFormatting';
import { removeMarkdownLinks } from '../../../../utils/markdown/removeMarkdownLinks';
import { aboutPromptbookInformation } from '../../../../utils/misc/aboutPromptbookInformation';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../../version';

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
    const commentLines = aboutPromptbookInformation({
        isServersInfoIncluded: false,
        isRuntimeEnvironmentInfoIncluded: false,
    })
        .split(/\r?\n/)
        .map((line) => resolvePromptbookExportBrandingLine(line))
        .filter((line): line is string => Boolean(line));

    const detailLines = commentLines.filter((line) => line !== `Exported with ${NAME}.`);

    return {
        productName: NAME,
        creatorTool: `${NAME} ${PROMPTBOOK_ENGINE_VERSION}`,
        metadataSummary: `${CLAIM}. Exported with ${NAME}.`,
        keywords: [NAME, 'chat export', 'AI agents', 'Book language'],
        commentLines,
        detailLines,
    };
}

/**
 * Converts one markdown line from `aboutPromptbookInformation()` into plain-text export branding.
 *
 * @private Internal helper of `getPromptbookExportBranding`.
 */
function resolvePromptbookExportBrandingLine(line: string): string | undefined {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('# ')) {
        return `Exported with ${trimmedLine.slice(2).trim()}.`;
    }

    if (!trimmedLine.startsWith('- ')) {
        return undefined;
    }

    return removeMarkdownFormatting(removeMarkdownLinks(trimmedLine.slice(2))).trim();
}
