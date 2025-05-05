import type { Executables } from '../../../execution/Executables';
import type { string_mime_type, string_promptbook_documentation_url, string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';

/**
 * Metadata interface for scrapers and converters in the system.
 * Contains information about the capabilities and requirements of a scraper or converter.
 *
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
     * Human-readable title of the scraper or converter.
     * Used for display purposes in logs and interfaces.
     */
    readonly title: string_title;

    /**
     * Mime types that this scraper can handle
     */
    readonly mimeTypes: ReadonlyArray<string_mime_type /* <- TODO: [🦔] `string_mime_type_with_wildcard` */>;

    /**
     * Flag indicating whether this scraper or converter can run in a browser environment.
     * Some scrapers require Node.js capabilities and cannot run client-side.
     *
     * Note: [🌏] Only `MarkdownScraper` makes sense to be available in the browser, for scraping non-markdown sources in the browser use a remote server
     */
    readonly isAvilableInBrowser: boolean;

    /**
     * List of executables required by this scraper or converter to function properly.
     * For example, PDF scrapers may require 'pandoc' to be installed on the system.
     */
    readonly requiredExecutables: ReadonlyArray<Capitalize<keyof Executables extends `${infer N}Path` ? N : never>>;

    /**
     * Link to documentation
     */
    readonly documentationUrl: string_promptbook_documentation_url;
};
