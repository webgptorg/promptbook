/**
 * Client-side safe wrapper for fetching URL content
 *
 * This function proxies requests to the Agents Server API endpoint for scraping,
 * making it safe to use in browser environments.
 *
 * @param url The URL to fetch and scrape
 * @param agentsServerUrl The base URL of the agents server (defaults to current origin)
 * @returns Markdown content from the URL
 *
 * @private internal utility for USE BROWSER commitment
 */
export async function fetchUrlContentViaBrowser(url: string, agentsServerUrl?: string): Promise<string> {
    try {
        // Determine the agents server URL
        const baseUrl = agentsServerUrl || (typeof window !== 'undefined' ? window.location.origin : '');

        if (!baseUrl) {
            throw new Error('Agents server URL is required in non-browser environments');
        }

        // Build the API endpoint URL
        const apiUrl = new URL('/api/scrape', baseUrl);
        apiUrl.searchParams.set('url', url);

        // Fetch from the API endpoint
        const response = await fetch(apiUrl.toString());

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Failed to scrape URL: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !data.content) {
            throw new Error(`Scraping failed: ${data.error || 'No content returned'}`);
        }

        return data.content;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Error fetching URL content via browser: ${errorMessage}`);
    }
}
