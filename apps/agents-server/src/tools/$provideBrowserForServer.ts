import { locateChrome } from 'locate-app';
import { Browser, chromium } from 'playwright';

const globalForBrowser = globalThis as unknown as {
    _browserInstance: Browser | undefined;
};

export async function $provideBrowserForServer(): Promise<Browser> {
    if (!globalForBrowser._browserInstance || !globalForBrowser._browserInstance.isConnected()) {
        console.log('Launching new browser instance...');
        globalForBrowser._browserInstance = await chromium.launch({
            executablePath: await locateChrome(),
            headless: false,
        });
    }
    return globalForBrowser._browserInstance;
}
