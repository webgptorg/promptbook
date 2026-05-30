import { $provideBrowserForServer } from '@/src/tools/$provideBrowserForServer';

/**
 * Browser viewport used while rendering standalone HTML exports to PDF.
 */
const CHAT_EXPORT_PDF_VIEWPORT = {
    width: 1280,
    height: 1600,
} as const;

/**
 * Prints standalone HTML into a PDF using the shared server-side Chromium instance.
 *
 * @param html - Fully rendered standalone HTML document.
 * @returns PDF bytes ready for an HTTP response.
 */
export async function renderHtmlToPdfOnServer(html: string): Promise<Buffer> {
    const browserContext = await $provideBrowserForServer();
    const page = await browserContext.newPage();

    try {
        await page.setViewportSize(CHAT_EXPORT_PDF_VIEWPORT);
        await page.emulateMedia({ media: 'print' });
        await page.setContent(html, { waitUntil: 'load' });
        await page.evaluate(async () => {
            await document.fonts?.ready;
        });

        return await page.pdf({
            format: 'Letter',
            printBackground: true,
            preferCSSPageSize: true,
        });
    } finally {
        await page.close();
    }
}
