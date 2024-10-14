import type { string_mime_type, string_promptbook_documentation_url } from '../../types/typeAliases';
import type { ScraperSourceHandler } from './Scraper';
import type { ScraperIntermediateSource } from './ScraperIntermediateSource';

/**
 * @@@
 *
 */
export type Converter = {
    /**
     * Mime types that this scraper can handle
     */
    readonly mimeTypes: Array<string_mime_type /* <- TODO: [🦔] `string_mime_type_with_wildcard` */>;

    /**
     * Link to documentation
     */
    readonly documentationUrl: string_promptbook_documentation_url;

    /**
     * Convert the the file and returns intermediate source or `null` if it can't convert it
     *
     * For example, convert a `.docx` to `.doc` file
     * Or convert a `.pdf` to `.md` file
     *
     * Note: `$` is used to indicate that this function is not a pure function - it leaves files on the disk and you are responsible for cleaning them by calling `destroy` method of returned object
     */
    $convert(source: ScraperSourceHandler): Promise<ScraperIntermediateSource>;
};
