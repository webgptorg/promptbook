import type { string_executable_path } from '../../types/string_filename';
import { locateApp } from '../locateApp';

/**
 * @@@
 *
 * @private within the repository
 */
export function locateInternetExplorer(): Promise<string_executable_path | null> {
    return locateApp({
        appName: 'ie',
        windowsSuffix: '\\Internet Explorer\\iexplore.exe',
    });
}
