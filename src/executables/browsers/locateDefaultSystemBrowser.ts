import type { string_executable_path } from '../../types/typeAliases';

/**
 * @@@
 * @param browser It can be "default", "chrome", "firefox", "safari", "ie", "msie", "edge" or "msedge" or executable path to the browser
 * @returns executable path to browser
 *
 * @private within the repository
 */
export async function locateDefaultSystemBrowser(): Promise<string_executable_path | null> {
    return 'chrome';
    // TODO: Get default system browser DO not expect Chrome
    //       @see https://www.npmjs.com/package/x-default-browser
}
