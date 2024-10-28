import { string_executable_path } from '../../types/typeAliases';
import { locateApp } from '../locateApp';

export function locateLibreoffice(): Promise<string_executable_path> {
    return locateApp({
        appName: 'Libreoffice',
        linuxWhich: 'libreoffice',
        windowsSuffix: '\\LibreOffice\\program\\soffice.exe',
        macOsName: 'LibreOffice',
    });
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
