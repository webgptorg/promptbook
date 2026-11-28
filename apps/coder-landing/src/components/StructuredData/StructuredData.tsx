import { createLandingPageStructuredData } from '@/data/structuredData';

/**
 * Renders the JSON-LD structured data of the landing page, which tells search engines
 * what the page, the product and the company behind them are.
 *
 * Note: Specified in [`specs/metadata.md`](../../../specs/metadata.md)
 */
export function StructuredData() {
    const structuredDataJson = JSON.stringify(createLandingPageStructuredData())
        // Note: `<` is escaped so that no value of the graph can ever close the `<script>` element
        .replace(/</g, '\\u003c');

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataJson }} />;
}
