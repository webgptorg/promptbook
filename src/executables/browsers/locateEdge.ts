import type { string_executable_path } from '../../types/string_filename';
import { locateApp } from '../locateApp';

/**
 * @@@
 *
 * @private within the repository
 */
export function locateEdge(): Promise<string_executable_path | null> {
    return locateApp({
        appName: 'Edge',
        windowsSuffix: '\\Microsoft\\Edge\\Application\\msedge.exe',
        linuxWhich: 'microsoft-edge',
        // TODO: Is there an macOS and Linux version of Edge?
    });
}
