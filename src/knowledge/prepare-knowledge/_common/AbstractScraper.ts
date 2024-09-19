import type { Promisable } from 'type-fest';
import { KnowledgePiecePreparedJson } from '../../../_packages/types.index';
import type {
    string_file_path,
    string_knowledge_source_link,
    string_mime_type,
    string_mime_type_with_wildcard,
    string_promptbook_documentation_url,
} from '../../../types/typeAliases';
import type { really_unknown } from '../../../utils/organization/really_unknown';

/**
 * @@@
 *
 * @private Internal utility type
 */
export type AbstractScraper = {
    /**
     * Mime types that this scraper can handle
     */
    readonly mimeTypes: Array<string_mime_type_with_wildcard>;

    /**
     * Link to documentation
     */
    readonly documentationUrl: string_promptbook_documentation_url;

    /**
     * Examples what this scraper can scrape
     */
    readonly examples: Array<string_file_path>;

    /**
     * Scrapes the markdown file and returns the knowledge pieces or `null` if it can't scrape it
     */
    scrape(source: ScraperSourceOptions): Promisable<Array<KnowledgePiecePreparedJson> | null>;

};

/**
 * @@@
 */
export type ScraperSourceOptions = {
    readonly source: string_knowledge_source_link;

    readonly mimeType: string_mime_type;

    asJson(): Promise<really_unknown>;

    asText(): Promise<really_unknown>;

    asBlob(): Promise<really_unknown>;
};

/**
 * TODO: [🐝] @@@ Annotate all
 * TODO: [🔼] Export via types
 */
