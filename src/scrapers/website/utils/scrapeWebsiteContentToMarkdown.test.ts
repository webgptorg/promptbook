import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { scrapeWebsiteContentToMarkdown } from './scrapeWebsiteContentToMarkdown';

describe('scrapeWebsiteContentToMarkdown', () => {
    it('converts simple website HTML content to markdown', async () => {
        const html = spaceTrim(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Ignored title</title>
                </head>
                <body>
                    <header>Navigation</header>
                    <main>
                        <article>
                            <h1>Bitcoin Basics</h1>
                            <p>The protocol enables peer-to-peer electronic cash.</p>
                        </article>
                    </main>
                </body>
            </html>
        `);

        const markdown = await scrapeWebsiteContentToMarkdown({
            url: 'https://example.com/docs/bitcoin',
            html,
            isVerbose: false,
        });

        expect(markdown).toContain('Bitcoin Basics');
        expect(markdown).toContain('peer-to-peer electronic cash');
    });
});
