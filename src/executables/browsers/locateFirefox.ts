import type { string_executable_path } from '../../types/string_filename';
import { locateApp } from '../locateApp';

/**
 * @@@
 *
 * @private within the repository
 */
export function locateFirefox(): Promise<string_executable_path | null> {
    return locateApp({
        appName: 'Firefox',
        linuxWhich: 'firefox',
        windowsSuffix: '\\Mozilla Firefox\\firefox.exe',
        macOsName: 'Firefox',
    });
}
