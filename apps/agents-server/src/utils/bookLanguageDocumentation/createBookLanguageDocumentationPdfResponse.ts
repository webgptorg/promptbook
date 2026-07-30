import { renderMarkdown } from '../../../../../src/book-components/Chat/utils/renderMarkdown';
import type { string_markdown } from '../../../../../src/types/string_markdown';
import { NextResponse } from 'next/server';
import { renderHtmlToPdfOnServer } from '../pdf/renderHtmlToPdfOnServer';
import {
    createBookLanguageDocumentationExport,
    type BookLanguageDocumentationExportOptions,
} from './createBookLanguageDocumentationMarkdownResponse';

/**
 * HTML document used to produce the standalone Book language manual PDF.
 *
 * The document intentionally uses no application layout or remote assets, so
 * it remains readable and deterministic in headless Chromium.
 */
const BOOK_LANGUAGE_DOCUMENTATION_PDF_STYLES = `
    @page {
        size: A4;
        margin: 16mm 14mm 18mm;
    }

    :root {
        color: #172033;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10.5pt;
        line-height: 1.52;
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        color: #172033;
        background: #ffffff;
    }

    main {
        max-width: 100%;
    }

    h1,
    h2,
    h3,
    h4 {
        color: #111827;
        break-after: avoid;
        page-break-after: avoid;
    }

    h1 {
        margin: 0 0 0.8rem;
        font-size: 26pt;
        letter-spacing: -0.035em;
        line-height: 1.15;
    }

    h2 {
        margin: 2.2rem 0 0.75rem;
        padding-bottom: 0.35rem;
        border-bottom: 1px solid #cbd5e1;
        font-size: 17pt;
        line-height: 1.25;
    }

    h3 {
        margin: 1.5rem 0 0.45rem;
        font-size: 13pt;
        line-height: 1.3;
    }

    h4 {
        margin: 1rem 0 0.35rem;
        font-size: 11pt;
    }

    p,
    ul,
    ol,
    blockquote,
    pre,
    table {
        margin: 0 0 0.8rem;
    }

    ul,
    ol {
        padding-left: 1.35rem;
    }

    li + li {
        margin-top: 0.2rem;
    }

    a {
        color: #1d4ed8;
        text-decoration: none;
    }

    code {
        padding: 0.08rem 0.28rem;
        border-radius: 0.2rem;
        background: #eff6ff;
        color: #1e3a8a;
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-size: 0.9em;
    }

    pre {
        overflow-wrap: anywhere;
        padding: 0.85rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.4rem;
        background: #f8fafc;
        color: #172033;
        break-inside: avoid;
        page-break-inside: avoid;
        white-space: pre-wrap;
    }

    pre code {
        padding: 0;
        background: transparent;
        color: inherit;
        font-size: 8.4pt;
        line-height: 1.42;
    }

    blockquote {
        margin-left: 0;
        padding: 0.55rem 0.8rem;
        border-left: 3px solid #2563eb;
        background: #eff6ff;
        color: #334155;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th,
    td {
        padding: 0.45rem;
        border: 1px solid #cbd5e1;
        text-align: left;
        vertical-align: top;
    }

    th {
        background: #f1f5f9;
    }

    hr {
        margin: 1.4rem 0;
        border: 0;
        border-top: 1px solid #cbd5e1;
    }
`;

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
    const html = createBookLanguageDocumentationPdfHtml(exportContent.markdown, exportContent.language);
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
 * @param markdown - Manual content generated from the core Book language registry.
 * @param language - Language metadata selected by the person exporting the manual.
 * @returns Standalone printable HTML document.
 */
export function createBookLanguageDocumentationPdfHtml(markdown: string_markdown, language: string): string {
    return `<!doctype html>
<html lang="${escapeHtml(language)}">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Book Language Manual</title>
    <style>${BOOK_LANGUAGE_DOCUMENTATION_PDF_STYLES}</style>
</head>
<body>
    <main>${renderMarkdown(markdown)}</main>
</body>
</html>`;
}

/**
 * Escapes text inserted into a standalone HTML attribute.
 *
 * @param value - Plain text attribute value.
 * @returns HTML-safe attribute text.
 *
 * @private internal utility of Book language PDF export
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
