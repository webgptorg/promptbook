import { spaceTrim } from 'spacetrim';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ScraperSourceHandler } from '../../scrapers/_common/Scraper';
import { promptbookFetch } from '../../scrapers/_common/utils/promptbookFetch';
import { WebsiteScraper } from '../../scrapers/website/WebsiteScraper';

/**
 * Fetches and scrapes content from a URL (SERVER-SIDE ONLY)
 *
 * This function:
 * 1. Fetches the URL content using promptbookFetch
 * 2. Determines the content type (HTML, PDF, etc.)
 * 3. Uses the appropriate scraper to convert to markdown
 * 4. Returns the scraped markdown content
 *
 * @param url The URL to fetch and scrape
 * @returns Markdown content from the URL
 *
 * @private internal utility for USE BROWSER commitment
 *
 * WARNING: This function should NOT be used directly in browser environments.
 * For browser environments, use fetchUrlContentViaBrowser which proxies through
 * the Agents Server API endpoint at /api/scrape
 */
export async function fetchUrlContent(url: string): Promise<string> {
    try {
        // Validate URL
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch (error) {
            throw new Error(`Invalid URL: ${url}`);
        }

        // Fetch the URL content
        const response = await promptbookFetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        // Get content type
        const contentType = response.headers.get('content-type') || 'text/html';
        const content = await response.text();

        // Determine the appropriate scraper based on content type
        const mimeType = (contentType.split(';')[0] || 'text/html').trim();

        // Handle PDFs
        if (mimeType === 'application/pdf' || url.toLowerCase().endsWith('.pdf')) {
            // TODO: [🔰] Implement PDF scraping using PdfScraper
            // For now, return a message indicating PDF support is coming
            return spaceTrim(`
                # PDF Document: ${parsedUrl.pathname.split('/').pop()}

                **Note:** PDF scraping is not yet fully implemented.

                **URL:** ${url}

                The PDF scraper will be integrated to provide full document content extraction.
                For now, please try to find an HTML version of this content or use a different source.
            `);
        }

        // Handle HTML/websites
        if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml' || !mimeType.includes('/')) {
            // Create a scraper source handler
            const sourceHandler: ScraperSourceHandler = {
                source: url,
                filename: null,
                url,
                mimeType: 'text/html',
                asText: () => content,
                asJson: () => {
                    throw new Error('JSON conversion not supported for HTML content');
                },
            };

            // Use WebsiteScraper to convert HTML to markdown
            // Note: We need minimal tools for the scraper
            const scraper = new WebsiteScraper( // <- TODO: !!!!! Things marked with [🟢] should never be never released in packages that could be imported into browser environment
                {
                    // Minimal tools - fs and llm are optional for basic scraping
                    fs: undefined,
                    llm: undefined as LlmExecutionTools | undefined,
                },
                {
                    isVerbose: false,
                },
            );

            // Convert to markdown
            const intermediateSource = await scraper.$convert(sourceHandler);
            const markdown = intermediateSource.markdown;

            // Clean up intermediate files
            await intermediateSource.destroy();

            // Add URL header to the content
            return spaceTrim(`
                # Content from: ${url}

                ${markdown}

                ---

                *Source: ${url}*
            `);
        }

        // For other content types, return the raw content with a note
        return spaceTrim(`
            # Content from: ${url}

            **Content Type:** ${contentType}

            ${content}

            ---

            *Source: ${url}*
        `);
    } catch (error) {
        // Handle errors gracefully
        const errorMessage = error instanceof Error ? error.message : String(error);
        return spaceTrim(`
            # Error fetching content from URL

            **URL:** ${url}

            **Error:** ${errorMessage}

            Unable to fetch and scrape the content from this URL.
            Please verify the URL is correct and accessible.
        `);
    }
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
