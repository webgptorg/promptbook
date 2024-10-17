import type { ScraperAndConverterMetadata } from './register/ScraperAndConverterMetadata';
import type { ScraperSourceHandler } from './Scraper';
import type { ScraperIntermediateSource } from './ScraperIntermediateSource';

/**
 * @@@
 *
 */
export type Converter = {
    /**
     * Metadata of the converter which includes title, mime types, etc.
     */
    readonly metadata: ScraperAndConverterMetadata;

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
