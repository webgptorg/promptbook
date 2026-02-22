import type { string_knowledge_source_link } from '../../../../../src/types/typeAliases';
import { $provideFilesystemForNode } from '../../../../../src/scrapers/_common/register/$provideFilesystemForNode';
import type { ScraperSourceHandler } from '../../../../../src/scrapers/_common/Scraper';
import { makeKnowledgeSourceHandler } from '../../../../../src/scrapers/_common/utils/makeKnowledgeSourceHandler';
import { promptbookFetch } from '../../../../../src/scrapers/_common/utils/promptbookFetch';
import { WebsiteScraper } from '../../../../../src/scrapers/website/WebsiteScraper';
import {
    createInlineKnowledgeSourceFile,
    type InlineKnowledgeSourceUploader,
} from '../../../../../src/utils/knowledge/inlineKnowledgeSource';
import { isUrlOnPrivateNetwork } from '../../../../../src/utils/validators/url/isUrlOnPrivateNetwork';

/**
 * MIME types that are treated as websites and scraped to markdown.
 */
const WEBSITE_MIME_TYPES = new Set(['text/html', 'application/xhtml+xml']);

/**
 * File extensions that are already document-like knowledge sources and should not be website-scraped.
 */
const NON_WEBSITE_EXTENSIONS = new Set([
    'pdf',
    'txt',
    'md',
    'markdown',
    'json',
    'csv',
    'xml',
    'yml',
    'yaml',
    'doc',
    'docx',
    'odt',
    'rtf',
    'ppt',
    'pptx',
    'xls',
    'xlsx',
    'epub',
]);

/**
 * Options for resolving website knowledge sources into uploaded inline files.
 */
export type ResolveWebsiteKnowledgeSourcesForServerOptions = {
    /**
     * Upload purpose forwarded to CDN file tracking.
     */
    readonly purpose?: string;

    /**
     * Optional user ID attached to uploaded knowledge files.
     */
    readonly userId?: number;

    /**
     * Enables diagnostic logging.
     */
    readonly isVerbose?: boolean;

    /**
     * Optional scraper override used primarily by tests.
     */
    readonly scrapeWebsiteToMarkdown?: (sourceUrl: string_knowledge_source_link) => Promise<string | null>;

    /**
     * Optional uploader override used primarily by tests.
     */
    readonly uploadInlineKnowledgeSource?: InlineKnowledgeSourceUploader;

    /**
     * Optional private-network detector override used primarily by tests.
     */
    readonly isPrivateNetworkUrl?: (sourceUrl: string_knowledge_source_link) => boolean;
};

/**
 * Converts website-like knowledge URLs to uploaded inline markdown files for vector-store ingestion.
 *
 * This keeps document sources (`.pdf`, `.txt`, etc.) untouched and only shallowly scrapes direct website URLs.
 * Private-network URLs are intentionally skipped for security reasons.
 */
export async function resolveWebsiteKnowledgeSourcesForServer(
    knowledgeSources: ReadonlyArray<string_knowledge_source_link>,
    options: ResolveWebsiteKnowledgeSourcesForServerOptions = {},
): Promise<ReadonlyArray<string_knowledge_source_link>> {
    const { isVerbose = false } = options;

    if (knowledgeSources.length === 0) {
        return knowledgeSources;
    }

    const uploadInlineKnowledgeSource =
        options.uploadInlineKnowledgeSource || (await createDefaultInlineKnowledgeSourceUploader(options));

    const scrapeWebsiteToMarkdown = options.scrapeWebsiteToMarkdown || (await createWebsiteMarkdownScraper(isVerbose));
    const isPrivateNetworkUrl =
        options.isPrivateNetworkUrl || ((sourceUrl: string_knowledge_source_link) => isUrlOnPrivateNetwork(sourceUrl));

    const resolvedKnowledgeSources: string_knowledge_source_link[] = [];

    for (const source of knowledgeSources) {
        if (!isLikelyWebsiteKnowledgeSourceUrl(source)) {
            resolvedKnowledgeSources.push(source);
            continue;
        }

        if (isPrivateNetworkUrl(source)) {
            if (isVerbose) {
                console.warn('[knowledge] Skipping private-network website knowledge source', { source });
            }
            resolvedKnowledgeSources.push(source);
            continue;
        }

        try {
            const markdown = await scrapeWebsiteToMarkdown(source);

            if (!markdown) {
                resolvedKnowledgeSources.push(source);
                continue;
            }

            const inlineSource = createInlineKnowledgeSourceFile(`Source URL: ${source}\n\n${markdown}`);
            const uploadedSource = await uploadInlineKnowledgeSource(inlineSource);
            resolvedKnowledgeSources.push(uploadedSource);
        } catch (error) {
            if (isVerbose) {
                console.warn('[knowledge] Failed to scrape website knowledge source, using original source instead', {
                    source,
                    error,
                });
            }
            resolvedKnowledgeSources.push(source);
        }
    }

    return resolvedKnowledgeSources;
}

/**
 * Returns true when the knowledge source looks like a website URL suitable for shallow scraping.
 */
export function isLikelyWebsiteKnowledgeSourceUrl(source: string): boolean {
    if (!isHttpKnowledgeSourceUrl(source)) {
        return false;
    }

    try {
        const url = new URL(source);
        const lastPathSegment = decodeURIComponent(url.pathname.split('/').pop() || '').toLowerCase();
        const extensionSeparatorIndex = lastPathSegment.lastIndexOf('.');

        if (extensionSeparatorIndex === -1) {
            return true;
        }

        const extension = lastPathSegment.substring(extensionSeparatorIndex + 1);
        return !NON_WEBSITE_EXTENSIONS.has(extension);
    } catch {
        return false;
    }
}

/**
 * Creates a scraper function that performs a shallow website scrape and returns markdown.
 */
async function createWebsiteMarkdownScraper(
    isVerbose: boolean,
): Promise<(sourceUrl: string_knowledge_source_link) => Promise<string | null>> {
    const fs = $provideFilesystemForNode({ isVerbose });
    const websiteScraper = new WebsiteScraper(
        {
            fs,
            llm: undefined,
        },
        { isVerbose },
    );

    return async (sourceUrl: string_knowledge_source_link): Promise<string | null> => {
        const sourceHandler = await makeKnowledgeSourceHandler(
            { knowledgeSourceContent: sourceUrl },
            { fs, fetch: promptbookFetch },
            { isVerbose },
        );

        if (!isWebsiteSourceHandler(sourceHandler)) {
            return null;
        }

        const intermediateSource = await websiteScraper.$convert(sourceHandler);

        try {
            const markdown = intermediateSource.markdown.trim();
            return markdown || null;
        } finally {
            try {
                await intermediateSource.destroy();
            } catch (error) {
                if (isVerbose) {
                    console.warn('[knowledge] Failed to clean website scraper intermediate source', {
                        sourceUrl,
                        error,
                    });
                }
            }
        }
    };
}

/**
 * Returns true when a source handler resolves to a website-like MIME type.
 */
function isWebsiteSourceHandler(sourceHandler: ScraperSourceHandler): boolean {
    return WEBSITE_MIME_TYPES.has(sourceHandler.mimeType);
}

/**
 * Returns true for HTTP(S) sources.
 */
function isHttpKnowledgeSourceUrl(source: string): boolean {
    return source.startsWith('http://') || source.startsWith('https://');
}

/**
 * Creates the default uploader lazily to avoid loading heavy server dependencies when custom uploaders are injected.
 */
async function createDefaultInlineKnowledgeSourceUploader(
    options: ResolveWebsiteKnowledgeSourcesForServerOptions,
): Promise<InlineKnowledgeSourceUploader> {
    const { createInlineKnowledgeSourceUploader } = await import('./createInlineKnowledgeSourceUploader');
    return createInlineKnowledgeSourceUploader({
        purpose: options.purpose,
        userId: options.userId,
    });
}
