import type { string_executable_path } from '../../types/string_filename';
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

// Note: [🟢] Code for Node executable locator [locatePandoc](src/executables/apps/locatePandoc.ts) should never be published into packages that could be imported into browser environment
// TODO: [🧠][♿] Maybe export through `@promptbook/node` OR `@promptbook/documents`
