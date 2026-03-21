import { locateApp } from '../locateApp';
import type { string_executable_path } from '../../types/typeAliases';


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
