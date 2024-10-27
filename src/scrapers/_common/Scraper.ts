import type { Promisable } from 'type-fest';
import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type { string_filename } from '../../types/typeAliases';
import type { string_knowledge_source_link } from '../../types/typeAliases';
import type { string_mime_type } from '../../types/typeAliases';
import type { string_url } from '../../types/typeAliases';
import type { ScraperAndConverterMetadata } from './register/ScraperAndConverterMetadata';

/**
 * @@@
 *
 */
export type Scraper = {
    /**
     * Metadata of the scraper which includes title, mime types, etc.
     */
    readonly metadata: ScraperAndConverterMetadata;

    /**
     * Scrapes the markdown file and returns the knowledge pieces or `null` if it can't scrape it
     */
    scrape(
        source: ScraperSourceHandler,
    ): Promisable<ReadonlyArray<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null>;
};

/**
 * @@@
 */
export type ScraperSourceHandler = {
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
