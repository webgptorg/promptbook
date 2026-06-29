import { describe, expect, it } from '@jest/globals';
import { sanitizeChatPdfExportHtml } from './sanitizeChatPdfExportHtml';

describe('sanitizeChatPdfExportHtml', () => {
    it('removes private resource URLs before Playwright sees the HTML', () => {
        const sanitizedHtml = sanitizeChatPdfExportHtml(`
            <!doctype html>
            <html>
                <body>
                    <img src="http://127.0.0.1/admin.png" alt="blocked">
                    <iframe src="http://localhost/internal"></iframe>
                    <a href="http://169.254.169.254/latest/meta-data">metadata</a>
                    <a href="//127.0.0.1/protocol-relative">protocol-relative</a>
                    <a href="https://example.com/source.pdf">source</a>
                    <a href="#source-1">footnote</a>
                    <div style="background-image: url('http://10.0.0.1/private.png'); color: red;"></div>
                </body>
            </html>
        `);

        expect(sanitizedHtml).toContain('<img alt="blocked">');
        expect(sanitizedHtml).toContain('<iframe></iframe>');
        expect(sanitizedHtml).toContain('<a>metadata</a>');
        expect(sanitizedHtml).toContain('<a>protocol-relative</a>');
        expect(sanitizedHtml).toContain('<a href="https://example.com/source.pdf">source</a>');
        expect(sanitizedHtml).toContain('<a href="#source-1">footnote</a>');
        expect(sanitizedHtml).toContain('background-image: none');
        expect(sanitizedHtml).not.toContain('127.0.0.1');
        expect(sanitizedHtml).not.toContain('localhost/internal');
        expect(sanitizedHtml).not.toContain('169.254.169.254');
        expect(sanitizedHtml).not.toContain('10.0.0.1');
    });
});
