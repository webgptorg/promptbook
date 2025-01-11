import type { Executables } from '../../../execution/Executables';
import type { string_mime_type } from '../../../types/typeAliases';
import type { string_promptbook_documentation_url } from '../../../types/typeAliases';
import type { string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';

/**
 * @@@
 *
 * @@@
 * x) `Scraper`
 * x) `Converter`
 * x) `ScraperConstructor`
 * x) `Registered`
 * x) `ExecutionTools`
 * x) `ScraperAndConverterMetadata`
 * x) `PrepareAndScrapeOptions`
 * x) `ScraperConfiguration`
 * x) `ScraperOptions`
 */
export type ScraperAndConverterMetadata = Registered & {
    /**
     * @@@
     */
    readonly title: string_title;

    /**
     * Mime types that this scraper can handle
     */
    readonly mimeTypes: ReadonlyArray<string_mime_type /* <- TODO: [🦔] `string_mime_type_with_wildcard` */>;

    /**
     * @@@
     *
     * Note: [🌏] Only `MarkdownScraper` makes sense to be available in the browser, for scraping non-markdown sources in the browser use a remote server
     */
    readonly isAvilableInBrowser: boolean;

    /**
     * @@@
     */
    readonly requiredExecutables: ReadonlyArray<Capitalize<keyof Executables extends `${infer N}Path` ? N : never>>;

    /**
     * Link to documentation
     */
    readonly documentationUrl: string_promptbook_documentation_url;
};
