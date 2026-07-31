import { spaceTrim } from 'spacetrim';
import { createBookSourceHighlightStyles } from '../../../../../src/book-components/BookEditor/createBookSourceHighlightStyles';
import { PROMPTBOOK_COLOR } from '../../../../../src/config';
import { darken } from '../../../../../src/utils/color/operators/darken';
import { BOOK_SOURCE_PRE_CLASS_NAME } from './highlightBookCodeBlocksInHtml';

/**
 * How much the Promptbook color is darkened for text printed on white paper.
 *
 * The brand color itself is a light cyan, which is unreadable as ink.
 *
 * @private internal constant of `createBookLanguageDocumentationPdfStyles`
 */
const BRAND_INK_DARKEN_AMOUNT = 0.5;

/**
 * Creates the stylesheet of the standalone Book language manual PDF.
 *
 * The stylesheet intentionally uses no remote assets, so it stays deterministic
 * in headless Chromium. Page breaking is driven by the sections created by
 * `groupHtmlHeadingSections`.
 *
 * @returns CSS for the printable manual document.
 */
export function createBookLanguageDocumentationPdfStyles(): string {
    const brandColor = PROMPTBOOK_COLOR.toHex();
    const brandInkColor = PROMPTBOOK_COLOR.then(darken(BRAND_INK_DARKEN_AMOUNT)).toHex();

    return spaceTrim(
        (block) => `
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
                color: ${brandInkColor};
                font-size: 26pt;
                letter-spacing: -0.035em;
                line-height: 1.15;
            }

            h2 {
                margin: 0 0 0.75rem;
                padding-bottom: 0.35rem;
                border-bottom: 2px solid ${brandInkColor};
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

            p,
            li,
            blockquote {
                orphans: 3;
                widows: 3;
            }

            ul,
            ol {
                padding-left: 1.35rem;
            }

            li + li {
                margin-top: 0.2rem;
            }

            a {
                color: ${brandInkColor};
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
                white-space: pre-wrap;
                orphans: 3;
                widows: 3;
            }

            pre code {
                padding: 0;
                background: transparent;
                color: inherit;
                font-size: 8.4pt;
                line-height: 1.42;
            }

            pre.${BOOK_SOURCE_PRE_CLASS_NAME} {
                border-color: ${brandColor}33;
                background: #fbfcff;
            }

            ${block(createBookSourceHighlightStyles())}

            blockquote {
                margin-left: 0;
                padding: 0.55rem 0.8rem;
                border-left: 3px solid ${brandInkColor};
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

            thead {
                display: table-header-group;
            }

            hr {
                margin: 1.4rem 0;
                border: 0;
                border-top: 1px solid #cbd5e1;
            }

            .manual-cover {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1.4rem;
                padding-bottom: 0.9rem;
                border-bottom: 3px solid ${brandInkColor};
                break-after: avoid;
                page-break-after: avoid;
            }

            .manual-cover-logo {
                width: 46px;
                height: 46px;
            }

            .manual-cover-product {
                color: ${brandInkColor};
                font-size: 15pt;
                font-weight: bold;
                letter-spacing: -0.02em;
            }

            .manual-cover-claim {
                margin: 0.1rem 0 0;
                color: #475569;
                font-size: 9pt;
                line-height: 1.35;
            }

            .manual-chapter {
                margin-top: 2.1rem;
            }

            .manual-section {
                margin-top: 1.2rem;
            }

            .manual-subsection {
                margin-top: 0.6rem;
            }

            .manual-footer {
                margin-top: 1.6rem;
                padding-top: 0.7rem;
                border-top: 1px solid #cbd5e1;
                color: #64748b;
                font-size: 8.5pt;
                break-inside: avoid;
                page-break-inside: avoid;
            }

            .manual-footer strong {
                color: ${brandInkColor};
            }
        `,
    );
}
