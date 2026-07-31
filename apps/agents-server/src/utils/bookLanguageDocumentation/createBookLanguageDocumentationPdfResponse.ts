import { NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { getPromptbookExportBranding } from '../../../../../src/book-components/Chat/save/_common/getPromptbookExportBranding';
import { renderMarkdown } from '../../../../../src/book-components/Chat/utils/renderMarkdown';
import type { string_markdown } from '../../../../../src/types/string_markdown';
import { escapeHtml } from '../../../../../src/utils/html/escapeHtml';
import { getPromptbookLogoDataUrl } from '../pdf/getPromptbookLogoDataUrl';
import { renderHtmlToPdfOnServer } from '../pdf/renderHtmlToPdfOnServer';
import {
    createBookLanguageDocumentationExport,
    type BookLanguageDocumentationExportOptions,
} from './createBookLanguageDocumentationMarkdownResponse';
import { createBookLanguageDocumentationPdfStyles } from './createBookLanguageDocumentationPdfStyles';
import { groupHtmlHeadingSections } from './groupHtmlHeadingSections';
import { highlightBookCodeBlocksInHtml } from './highlightBookCodeBlocksInHtml';

/**
 * Shared Promptbook branding embedded into standalone exports.
 *
 * @private internal type of Book language PDF export
 */
type PromptbookExportBranding = ReturnType<typeof getPromptbookExportBranding>;

/**
 * Everything needed to render the standalone Book language manual as HTML.
 */
export type CreateBookLanguageDocumentationPdfHtmlOptions = {
    /**
     * Manual content generated from the core Book language registry.
     */
    readonly markdown: string_markdown;

    /**
     * Language metadata selected by the person exporting the manual.
     */
    readonly language: string;

    /**
     * Inline Promptbook logo, or `null` when the asset could not be embedded.
     */
    readonly logoDataUrl: string | null;
};

/**
 * Creates a PDF response for a Book language manual.
 *
 * @param options - Agent selection and language shared by manual export formats.
 * @returns Ready-to-download PDF response.
 */
export async function createBookLanguageDocumentationPdfResponse(
    options: BookLanguageDocumentationExportOptions,
): Promise<NextResponse<Buffer>> {
    const exportContent = await createBookLanguageDocumentationExport(options);
    const html = createBookLanguageDocumentationPdfHtml({
        markdown: exportContent.markdown,
        language: exportContent.language,
        logoDataUrl: await getPromptbookLogoDataUrl(),
    });
    const pdf = await renderHtmlToPdfOnServer(html);

    return new NextResponse(pdf, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="book-language-manual.pdf"',
            'Content-Language': exportContent.language,
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}

/**
 * Creates self-contained HTML for the Book language manual PDF renderer.
 *
 * @param options - Manual content, language, and inline branding assets.
 * @returns Standalone printable HTML document.
 */
export function createBookLanguageDocumentationPdfHtml(
    options: CreateBookLanguageDocumentationPdfHtmlOptions,
): string {
    const { markdown, language, logoDataUrl } = options;
    const branding = getPromptbookExportBranding();
    const documentHtml = groupHtmlHeadingSections(highlightBookCodeBlocksInHtml(renderMarkdown(markdown)));

    return `<!doctype html>
<html lang="${escapeHtml(language)}">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${createPromptbookBrandingMetaTags(branding)}
    <title>${escapeHtml(branding.productName)} - Book Language Manual</title>
    <style>${createBookLanguageDocumentationPdfStyles()}</style>
</head>
<body>
    <main>
        ${createPromptbookBrandingHeader(branding, logoDataUrl)}
        ${documentHtml}
        ${createPromptbookBrandingFooter(branding)}
    </main>
</body>
</html>`;
}

/**
 * Renders the Promptbook branding meta tags of the exported document.
 *
 * @param branding - Shared Promptbook export branding.
 * @returns HTML meta tags describing the export.
 *
 * @private internal utility of Book language PDF export
 */
function createPromptbookBrandingMetaTags(branding: PromptbookExportBranding): string {
    return spaceTrim(`
        <meta name="application-name" content="${escapeHtml(branding.productName)}" />
        <meta name="author" content="${escapeHtml(branding.productName)}" />
        <meta name="generator" content="${escapeHtml(branding.creatorTool)}" />
        <meta name="description" content="${escapeHtml(branding.metadataSummary)}" />
        <meta name="keywords" content="${escapeHtml(branding.keywords.join(', '))}" />
    `);
}

/**
 * Renders the branded header shown above the manual title.
 *
 * @param branding - Shared Promptbook export branding.
 * @param logoDataUrl - Inline Promptbook logo, or `null` when it is unavailable.
 * @returns HTML header with the Promptbook mark and claim.
 *
 * @private internal utility of Book language PDF export
 */
function createPromptbookBrandingHeader(branding: PromptbookExportBranding, logoDataUrl: string | null): string {
    const logoHtml = logoDataUrl
        ? `<img class="manual-cover-logo" src="${escapeHtml(logoDataUrl)}" alt="${escapeHtml(
              branding.productName,
          )}" />`
        : '';

    return spaceTrim(`
        <header class="manual-cover">
            ${logoHtml}
            <div>
                <div class="manual-cover-product">${escapeHtml(branding.productName)}</div>
                <p class="manual-cover-claim">${escapeHtml(branding.metadataSummary)}</p>
            </div>
        </header>
    `);
}

/**
 * Renders the branded footer closing the exported manual.
 *
 * @param branding - Shared Promptbook export branding.
 * @returns HTML footer with Promptbook product details.
 *
 * @private internal utility of Book language PDF export
 */
function createPromptbookBrandingFooter(branding: PromptbookExportBranding): string {
    const detailsHtml = branding.detailLines.length > 0 ? ` - ${escapeHtml(branding.detailLines.join(' • '))}` : '';

    return `<footer class="manual-footer"><strong>${escapeHtml(branding.productName)}</strong>${detailsHtml}</footer>`;
}
