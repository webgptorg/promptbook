import type { string_executable_path } from '../../types/typeAliases';
import { locateApp } from '../locateApp';

/**
 * Locates the Pandoc executable on the current system by searching platform-specific paths.
 * Returns the path to the executable if found, or null otherwise.
 *
 * @private within the repository
 */
export function locatePandoc(): Promise<string_executable_path | null> {
    return locateApp({
        appName: 'Pandoc',
        linuxWhich: 'pandoc',
        windowsSuffix: '\\Pandoc\\pandoc.exe',
        macOsName: 'Pandoc',
    });
}

/**
 * TODO: [🧠][♿] Maybe export through `@promptbook/node` OR `@promptbook/documents`
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
