import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import { string_executable_path } from '../../types/typeAliases';

/**
 * @@@
 *
 * This extends Anthropic's `ClientOptions` with are directly passed to the Anthropic client.
 * @public exported from `@promptbook/anthropic-claude`
 */
export type XxxxScraperOptions = CommonToolsOptions & {
    // TODO: [☂️] Filter not needed options

    /**
     * Path to the `pandoc` executable
     *
     * @example 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe'
     */
    readonly pandocPath?: string_executable_path;

    /**
     * Path to the LibreOffice executable
     *
     * @example 'C:/Program Files/LibreOffice/program/swriter.exe'
     */
    readonly libreOfficePath?: string_executable_path;
};
