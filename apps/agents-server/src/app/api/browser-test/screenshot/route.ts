import { $provideBrowserForServer } from '@/src/tools/$provideBrowserForServer';
import { serializeError } from '@promptbook-local/utils';
import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../src/errors/assertsError';

export async function GET() {
    try {
        const browser = await $provideBrowserForServer();

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
