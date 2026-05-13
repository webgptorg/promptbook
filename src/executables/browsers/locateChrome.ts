import type { string_executable_path } from '../../types/string_filename';
import { locateApp } from '../locateApp';

/**
 * @@@
 *
 * @private within the repository
 */
export function locateChrome(): Promise<string_executable_path | null> {
    return locateApp({
        appName: 'Chrome',
        linuxWhich: 'google-chrome',
        windowsSuffix: '\\Google\\Chrome\\Application\\chrome.exe',
        macOsName: 'Google Chrome',
    });
}
