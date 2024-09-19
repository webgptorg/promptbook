import type { Promisable } from 'type-fest';
import { KnowledgePiecePreparedJson, PrepareOptions } from '../../../_packages/types.index';
import type {
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

/**
 * TODO: !!!!!! Test that this is catched
 * Note: [⚫] Code in this file should never be published in any package
 */