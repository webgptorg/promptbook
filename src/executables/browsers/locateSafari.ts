import type { string_executable_path } from '../../types/string_filename';
import { locateApp } from '../locateApp';

/**
 * @@@
 *
 * @private within the repository
 */
export function locateSafari(): Promise<string_executable_path | null> {
    return locateApp({
        appName: 'Safari',
        windowsSuffix: '\\Safari\\Safari.exe',
        macOsName: 'Safari',
    });
}
