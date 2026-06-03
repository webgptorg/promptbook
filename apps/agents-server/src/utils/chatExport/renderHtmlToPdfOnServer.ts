import { createServerChromiumLaunchOptions } from '@/src/tools/createServerChromiumLaunchOptions';
import { chromium } from 'playwright';

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
