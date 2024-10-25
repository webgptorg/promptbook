import { string_executable_path } from '../types/typeAliases';

/**
 * Paths to the external programs executables
 */
export type Executables = {
    /**
     * Path to the `pandoc` executable
     *
     * @example 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe'
     */
    pandocPath?: string_executable_path;

    /**
     * Path to the LibreOffice executable
     *
     * @example 'C:/Program Files/LibreOffice/program/swriter.exe'
     */
    libreOfficePath?: string_executable_path;
};
