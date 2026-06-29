import { createServerChromiumLaunchOptions } from '@/src/tools/createServerChromiumLaunchOptions';
import { chromium } from 'playwright';

/**
 * URL protocols that can be allowed through the PDF renderer request
 * interception because they cannot reach a server-side network destination.
 */
const CHAT_EXPORT_PDF_ALLOWED_REQUEST_PROTOCOLS = new Set(['about:', 'data:']);

/**
 * Browser viewport used while rendering standalone HTML exports to PDF.
 */
const CHAT_EXPORT_PDF_VIEWPORT = {
    width: 1280,
    height: 1600,
} as const;

/**
 * Page margins applied to every exported PDF page.
 */
const CHAT_EXPORT_PDF_MARGIN = {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
} as const;

/**
 * Prints standalone HTML into a PDF using a short-lived headless Chromium instance.
 *
 * @param html - Fully rendered standalone HTML document.
 * @returns PDF bytes ready for an HTTP response.
 */
export async function renderHtmlToPdfOnServer(html: string): Promise<Buffer> {
    const browser = await chromium.launch(await createServerChromiumLaunchOptions());

    try {
        const page = await browser.newPage();

        try {
            await page.route('**/*', async (route) => {
                const requestUrl = route.request().url();

                if (isAllowedPdfRendererRequestUrl(requestUrl)) {
                    await route.continue();
                    return;
                }

                await route.abort('blockedbyclient');
            });
            await page.setViewportSize(CHAT_EXPORT_PDF_VIEWPORT);
            await page.emulateMedia({ media: 'print' });
            await page.setContent(html, { waitUntil: 'load' });
            await page.evaluate(async () => {
                await document.fonts?.ready;
            });

            return await page.pdf({
                format: 'Letter',
                margin: CHAT_EXPORT_PDF_MARGIN,
                printBackground: true,
                preferCSSPageSize: true,
            });
        } finally {
            await page.close();
        }
    } finally {
        await browser.close();
    }
}

/**
 * Returns whether a Playwright request can proceed while rendering a chat export PDF.
 *
 * @param requestUrl - URL reported by Playwright for one intercepted request.
 * @returns Whether the request cannot reach an external or internal network host.
 *
 * @private internal helper of `renderHtmlToPdfOnServer`
 */
function isAllowedPdfRendererRequestUrl(requestUrl: string): boolean {
    try {
        return CHAT_EXPORT_PDF_ALLOWED_REQUEST_PROTOCOLS.has(new URL(requestUrl).protocol);
    } catch {
        return false;
    }
}
