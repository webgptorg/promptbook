import type { string_executable_path } from '../../types/typeAliases';
import { locateApp } from '../locateApp';

/**
 * Locates the LibreOffice executable on the current system by searching platform-specific paths.
 * Returns the path to the executable if found, or null otherwise.
 *
 * @private within the repository
 */
export function locateLibreoffice(): Promise<string_executable_path | null> {
    return locateApp({
        appName: 'Libreoffice',
        linuxWhich: 'libreoffice',
        windowsSuffix: '\\LibreOffice\\program\\soffice.exe',
        macOsName: 'LibreOffice',
    });
}

// Note: [🟢] Code for Node executable locator [locateLibreoffice](src/executables/apps/locateLibreoffice.ts) should never be published into packages that could be imported into browser environment
// TODO: [🧠][♿] Maybe export through `@promptbook/node` OR `@promptbook/legacy-documents`
