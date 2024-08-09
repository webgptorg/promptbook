import type { Promisable } from 'type-fest';
import type { string_file_path, string_knowledge_source_link, string_markdown, string_markdown_text, string_mime_type, string_mime_type_with_wildcard, string_promptbook_documentation_url } from '../../../types/typeAliases';
import type { really_unknown } from '../../../utils/organization/really_unknown';
/**
 * @@@
 *
 * @private still an internal experimental
 */
export type Scraper = {
    readonly description: string_markdown_text;
    readonly documentationUrl: string_promptbook_documentation_url;
    readonly examples: Array<string_file_path>;
    readonly mimeTypes: Array<string_mime_type_with_wildcard>;
    scrape(source: ScraperSourceOptions): Promisable<string_markdown>;
};
/**
 * @@@
 *
 * @private still an internal experimental
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
