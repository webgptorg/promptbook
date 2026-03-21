import { locateApp } from '../locateApp';
import type { string_executable_path } from '../../types/typeAliases';

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
