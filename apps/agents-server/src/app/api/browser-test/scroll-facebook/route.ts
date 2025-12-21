import { $provideBrowserForServer } from '@/src/tools/$provideBrowserForServer';
import { NextResponse } from 'next/server';
import { just } from '../../../../../../../src/utils/organization/just';

export const dynamic = 'force-dynamic';

export async function GET() {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                console.log('Starting Facebook scroll session');
                const browserContext = await $provideBrowserForServer();
                const page = await browserContext.newPage();

                await page.goto('https://www.facebook.com/');
                console.log('Navigated to Facebook');

                // Loop for streaming
                while (just(true)) {
                    // Check for login (simple check for now)
                    // Facebook uses role="banner" for the top navigation bar when logged in
                    const isLoggedIn = await page.$('div[role="banner"]');

                    if (isLoggedIn) {
                        // Scroll down
                        await page.evaluate(() => window.scrollBy(0, 500));
                        // console.log('Scrolled');
                    } else {
                        // console.log('Waiting for login...');
                    }

                    const buffer = await page.screenshot({ type: 'jpeg', quality: 50 });

                    const boundary = '--myboundary';
                    const header = `\r\n${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${buffer.length}\r\n\r\n`;

                    controller.enqueue(encoder.encode(header));
                    controller.enqueue(buffer);

                    // Short delay
                    await new Promise((r) => setTimeout(r, 200));
                }
            } catch (error) {
                console.error('Stream error:', error);
                try {
                    controller.close();
                } catch (e) {
                    // Ignore error if controller is already closed
                }
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'multipart/x-mixed-replace; boundary=myboundary',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
