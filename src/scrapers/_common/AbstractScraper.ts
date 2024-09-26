import type { Promisable } from 'type-fest';
import { KnowledgePiecePreparedJson, PrepareOptions } from '../../_packages/types.index';
import type {
    string_knowledge_source_link,
    string_mime_type,
    string_promptbook_documentation_url,
} from '../../types/typeAliases';

/**
 * @@@
 *
 * @private Internal utility type
 */
export type AbstractScraper = {
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
        options: PrepareOptions,
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
     * Mime type of the source
     */
    readonly mimeType: string_mime_type;

    /**
     * Get the content as parsed JSON
     */
    asJson(): Promise<unknown>;

    /**
     * Get the content as a utf-8 string
     */
    asText(): Promise<string>;

    /**
     * Get the content as a blob
     */
    asBlob(): Promise<Blob>;
};

/**
 * TODO: [🐝] @@@ Annotate all
 * TODO: [🔼] Export via types
 */

/**
 * TODO: !!!!!! Test that this is catched
 * Note: [⚫] Code in this file should never be published in any package
 */
