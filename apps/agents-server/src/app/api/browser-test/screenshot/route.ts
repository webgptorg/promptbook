import { $provideBrowserForServer } from '@/src/tools/$provideBrowserForServer';
import { serializeError } from '@promptbook-local/utils';
import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../src/errors/assertsError';

export async function GET() {
    try {
        const browserContext = await $provideBrowserForServer();

        const page = await browserContext.newPage();

        await page.goto('https://ptbk.io');
        const screenshotBuffer = await page.screenshot();

        // await page.close();
        // Do not close browser
        // <- TODO: !!!! Fix

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
