import { $provideFilesystemForNode } from '../../_packages/node.index';
import { TODO_any } from '../../_packages/types.index';
import type { string_executable_path } from '../../types/typeAliases';
import { isExecutable } from '../../utils/files/isExecutable';
import { locateChrome } from './locateChrome';
import { locateDefaultSystemBrowser } from './locateDefaultSystemBrowser';
import { locateEdge } from './locateEdge';
import { locateFirefox } from './locateFirefox';
import { locateInternetExplorer } from './locateInternetExplorer';
import { locateSafari } from './locateSafari';

/**
 * @@@
 * @param browser It can be "default", "chrome", "firefox", "safari", "ie", "msie", "edge" or "msedge" or executable path to the browser
 * @returns executable path to browser
 *
 * @private within the repository
 */
export async function locateBrowser(browser: string): Promise<string_executable_path | null> {
    if (/^[a-zA-Z]+$/.test(browser)) {
        browser = browser.toLowerCase();

        if (browser === 'default') {
            browser = (await locateDefaultSystemBrowser()) as TODO_any;
        } /* not else */
        if (browser === 'chrome') {
            return locateChrome();
        } else if (browser === 'firefox') {
            return locateFirefox();
        } else if (browser === 'safari') {
            return locateSafari();
        } else if (browser === 'ie' || browser === 'msie') {
            return locateInternetExplorer();
        } else if (browser === 'edge' || browser === 'msedge') {
            return locateEdge();
        } else {
            throw new Error(`Unknown browser "${browser}". You can pass full executable path instead. `);
        }
    } else if (/.*[\\/].*/.test(browser)) {
        if (await isExecutable(browser, await $provideFilesystemForNode())) {
            return browser;
        } else {
            throw new Error(`Can not access browser executable path "${browser}".`);
        }
    } else {
        throw new Error(`"${browser}" is not browser name or executable path to the browser.`);
    }
}
