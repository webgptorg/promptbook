import { serializeError } from '@promptbook-local/utils';
import { locateChrome } from 'locate-app';
import { NextResponse } from 'next/server';
import { Browser, chromium } from 'playwright';
import { assertsError } from '../../../../../../../src/errors/assertsError';

// Use globalThis to persist the browser instance across hot reloads in development
const globalForBrowser = globalThis as unknown as {
    _browserInstance: Browser | undefined;
};

export async function GET() {
    try {
        if (!globalForBrowser._browserInstance || !globalForBrowser._browserInstance.isConnected()) {
            console.log('Launching new browser instance...');
            globalForBrowser._browserInstance = await chromium.launch({
                executablePath: await locateChrome(),
                headless: false,
            });
        }
        const browser = globalForBrowser._browserInstance;

        let context = browser.contexts()[0];
        if (!context) {
            context = await browser.newContext();
        }
        const page = await context.newPage();

        await page.goto('https://ptbk.io');
        const screenshotBuffer = await page.screenshot();

        await page.close();
        // Do not close browser

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new NextResponse(new Blob([screenshotBuffer as any]), {
            headers: {
                'Content-Type': 'image/png',
            },
        });
    } catch (error) {
        assertsError(error);
        console.error('Error taking screenshot:', error);
        return NextResponse.json({ error: serializeError(error) }, { status: 500 });
    }
}
