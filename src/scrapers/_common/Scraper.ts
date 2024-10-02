import type { Promisable } from 'type-fest';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type {
    string_filename,
    string_knowledge_source_link,
    string_mime_type,
    string_promptbook_documentation_url,
    string_url,
} from '../../types/typeAliases';

/**
 * @@@
 *
 */
export type Scraper = {
    /**
     * Mime types that this scraper can handle
     */
    readonly mimeTypes: Array<string_mime_type /* <- TODO: [🦔] `string_mime_type_with_wildcard` */>;

    /**
     * Link to documentation
     */
    readonly documentationUrl: string_promptbook_documentation_url;

    /**
     * Scrapes the markdown file and returns the knowledge pieces or `null` if it can't scrape it
     */
    scrape(
        source: ScraperSourceOptions,
        options: PrepareAndScrapeOptions,
    ): Promisable<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null>;
};

/**
 * @@@
 */
export type ScraperSourceOptions = {
    /**
     * The source of the knowledge
     */
    readonly source: string_knowledge_source_link;

    /**
     * The path to the file, if it is a file
     *
     * Note: Typically one of the `filename` or `url` is set and the other is `null`
     */
    readonly filename: string_filename | null;

    /**
     * The URL, if it is online
     *
     * Note: Typically one of the `filename` or `url` is set and the other is `null`
     */
    readonly url: string_url | null;

    /**
     * Mime type of the source
     */
    readonly mimeType: string_mime_type;

    /**
     * Get the content as parsed JSON
     */
    asJson(): Promisable<unknown>;

    /**
     * Get the content as a utf-8 string
     */
    asText(): Promisable<string>;

    /**
     * Get the content as a blob
     */
    asBlob(): Promisable<Blob>;
};

/**
 * TODO: [🐝] @@@ Annotate all
 * TODO: [🔼] Export via types
 */

/**
 * TODO: !!!!!! Test that this is catched
 * Note: [⚫] Code in this file should never be published in any package
 */
