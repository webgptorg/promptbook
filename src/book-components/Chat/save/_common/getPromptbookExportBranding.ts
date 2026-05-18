import { removeMarkdownFormatting } from '../../../../utils/markdown/removeMarkdownFormatting';
import { removeMarkdownLinks } from '../../../../utils/markdown/removeMarkdownLinks';
import { aboutPromptbookInformation } from '../../../../utils/misc/aboutPromptbookInformation';

/**
 * Normalized Promptbook branding information reused by chat export formats.
 */
type PromptbookExportBranding = {
    /**
     * Product name resolved from Promptbook branding markdown.
     */
    readonly productName: string;

    /**
     * Optional brand claim/description line.
     */
    readonly claim?: string;

    /**
     * Detail lines such as engine and Book language versions.
     */
    readonly detailLines: ReadonlyArray<string>;

    /**
     * Small collection of human-readable lines suitable for comments or footers.
     */
    readonly commentLines: ReadonlyArray<string>;

    /**
     * Concise metadata summary suitable for document descriptions.
     */
    readonly metadataSummary: string;

    /**
     * Tool label suitable for document creator metadata.
     */
    readonly creatorTool: string;

    /**
     * Searchable keywords for exported documents.
     */
    readonly keywords: ReadonlyArray<string>;
};

/**
 * Converts one markdown line from `aboutPromptbookInformation()` into plain export copy.
 *
 * @private helper of chat export branding
 */
function normalizeBrandingLine(line: string): string {
    return removeMarkdownFormatting(removeMarkdownLinks(line)).replace(/\s+/g, ' ').trim();
}

/**
 * Resolves reusable Promptbook branding text for chat exports.
 *
 * @private helper of chat export formats
 */
export function getPromptbookExportBranding(): PromptbookExportBranding {
    const brandingMarkdown = aboutPromptbookInformation({
        isServersInfoIncluded: false,
        isRuntimeEnvironmentInfoIncluded: false,
    });

    let productName = 'Promptbook';
    let claim: string | undefined;
    const detailLines: string[] = [];

    for (const line of brandingMarkdown.split(/\r?\n/)) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
            continue;
        }

        if (trimmedLine.startsWith('# ')) {
            productName = normalizeBrandingLine(trimmedLine.slice(2)) || productName;
            continue;
        }

        if (trimmedLine.startsWith('- ')) {
            const detailLine = normalizeBrandingLine(trimmedLine.slice(2));
            if (detailLine) {
                detailLines.push(detailLine);
            }
            continue;
        }

        claim ??= normalizeBrandingLine(trimmedLine) || undefined;
    }

    const commentLines = [`Exported with ${productName}.`, claim, ...detailLines].filter((line): line is string =>
        Boolean(line),
    );

    return {
        productName,
        claim,
        detailLines,
        commentLines,
        metadataSummary: commentLines.join(' '),
        creatorTool: [productName, ...detailLines].join(' • '),
        keywords: [productName, 'chat export', 'AI agents', ...detailLines],
    };
}
