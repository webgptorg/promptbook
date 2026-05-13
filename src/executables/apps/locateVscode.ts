import type { string_executable_path } from '../../types/string_filename';
import { locateApp } from '../locateApp';

/**
 * @@@
 *
 * @private within the repository
 */
export function locateVscode(): Promise<string_executable_path | null> {
    return locateApp({
        appName: 'Code',
        linuxWhich: 'code',
        windowsSuffix: '\\Microsoft VS Code\\Code.exe',
        macOsName: 'Code',
    });
}
