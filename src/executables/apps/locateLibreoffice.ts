import type { string_executable_path } from '../../types/typeAliases';
import { locateApp } from '../locateApp';

/**
 * @@@
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

/**
 * TODO: [🧠][♿] Maybe export through `@promptbook/node` OR `@promptbook/legacy-documents`
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
