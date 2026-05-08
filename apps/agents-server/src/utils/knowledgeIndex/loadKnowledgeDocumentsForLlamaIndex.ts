import { Document } from 'llamaindex';
import { DEFAULT_MAX_FILE_SIZE } from '../../../../../src/config';
import type { string_knowledge_source_link } from '../../../../../src/types/typeAliases';
import { parseDataUrlKnowledgeSource } from '../../../../../src/utils/knowledge/inlineKnowledgeSource';
import { resolveWebsiteKnowledgeSourcesForServer } from '../knowledge/resolveWebsiteKnowledgeSourcesForServer';

/**
 * Metadata persisted on each LlamaIndex document and propagated to retrieved nodes.
 */
export type KnowledgeDocumentMetadata = {
    readonly source: string;
    readonly sourceUrl?: string;
    readonly sourceTitle: string;
    readonly originalSource?: string;
};

/**
 * Loads the configured knowledge sources into LlamaIndex documents.
 */
export async function loadKnowledgeDocumentsForLlamaIndex(options: {
    readonly knowledgeSources: ReadonlyArray<string>;
    readonly isVerbose?: boolean;
}): Promise<Array<Document<KnowledgeDocumentMetadata>>> {
    const resolvedSources = await resolveWebsiteKnowledgeSourcesForServer(
        options.knowledgeSources as ReadonlyArray<string_knowledge_source_link>,
        {
            purpose: 'knowledge-index',
            isVerbose: options.isVerbose,
        },
    );
    const documents: Array<Document<KnowledgeDocumentMetadata>> = [];

    for (let index = 0; index < resolvedSources.length; index++) {
        const source = resolvedSources[index]!;
        const originalSource = options.knowledgeSources[index] || source;
        const loadedSource = await loadKnowledgeSourceText({
            source,
            originalSource,
            isVerbose: options.isVerbose,
        });

        if (!loadedSource) {
            continue;
        }

        documents.push(
            new Document<KnowledgeDocumentMetadata>({
                text: loadedSource.text,
                metadata: {
                    source: loadedSource.displaySource,
                    sourceUrl: loadedSource.sourceUrl,
                    sourceTitle: loadedSource.sourceTitle,
                    ...(loadedSource.originalSource !== loadedSource.displaySource
                        ? { originalSource: loadedSource.originalSource }
                        : {}),
                },
                excludedEmbedMetadataKeys: ['sourceUrl', 'originalSource'],
            }),
        );
    }

    return documents;
}

/**
 * One loaded source prepared for LlamaIndex indexing.
 */
type LoadedKnowledgeSource = {
    readonly text: string;
    readonly displaySource: string;
    readonly sourceUrl?: string;
    readonly sourceTitle: string;
    readonly originalSource: string;
};

/**
 * Converts one knowledge source into plain markdown/text for indexing.
 */
async function loadKnowledgeSourceText(options: {
    readonly source: string;
    readonly originalSource: string;
    readonly isVerbose?: boolean;
}): Promise<LoadedKnowledgeSource | null> {
    const { source, originalSource, isVerbose } = options;
    const sourceTitle = resolveKnowledgeSourceTitle(originalSource);
    const sourceUrl = resolveKnowledgeSourceUrl(originalSource) || resolveKnowledgeSourceUrl(source);

    try {
        const dataUrlSource = parseDataUrlKnowledgeSource(source);
        if (dataUrlSource) {
            const text = dataUrlSource.buffer.toString('utf-8').trim();
            return text
                ? {
                      text,
                      displaySource: dataUrlSource.filename,
                      sourceTitle: dataUrlSource.filename,
                      originalSource,
                  }
                : null;
        }

        if (!isHttpSource(source)) {
            const text = source.trim();
            return text
                ? {
                      text,
                      displaySource: sourceTitle,
                      sourceTitle,
                      originalSource,
                  }
                : null;
        }

        const response = await fetch(source);
        if (!response.ok) {
            if (isVerbose) {
                console.warn('[knowledge-index] failed to load source', {
                    source,
                    status: response.status,
                });
            }

            return null;
        }

        const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
        const buffer = Buffer.from(await response.arrayBuffer());

        if (buffer.byteLength > DEFAULT_MAX_FILE_SIZE) {
            if (isVerbose) {
                console.warn('[knowledge-index] source too large, skipping', {
                    source,
                    sizeBytes: buffer.byteLength,
                });
            }

            return null;
        }

        const text = isTextLikeKnowledgeSource(source, contentType)
            ? buffer.toString('utf-8')
            : await convertDocumentSourceToMarkdown(source);
        const trimmedText = text.trim();

        return trimmedText
            ? {
                  text: trimmedText,
                  displaySource: sourceTitle,
                  sourceUrl,
                  sourceTitle,
                  originalSource,
              }
            : null;
    } catch (error) {
        if (isVerbose) {
            console.warn('[knowledge-index] failed to prepare source', {
                source,
                originalSource,
                error,
            });
        }

        return null;
    }
}

/**
 * Converts a document URL to markdown with MarkItDown.
 */
async function convertDocumentSourceToMarkdown(source: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MarkItDown } = require('markitdown-ts') as {
        MarkItDown: new () => {
            convert: (source: string) => Promise<{ text_content?: string } | null | undefined>;
        };
    };
    const markitdown = new MarkItDown();
    const result = await markitdown.convert(source);

    return result?.text_content || '';
}

/**
 * Returns true when a fetched source can be indexed directly as text.
 */
function isTextLikeKnowledgeSource(source: string, contentType: string): boolean {
    if (contentType.startsWith('text/')) {
        return true;
    }

    if (
        [
            'application/json',
            'application/ld+json',
            'application/xml',
            'application/xhtml+xml',
            'application/yaml',
            'application/x-yaml',
        ].includes(contentType)
    ) {
        return true;
    }

    const extension = resolveSourceExtension(source);
    return ['txt', 'md', 'markdown', 'json', 'csv', 'xml', 'yml', 'yaml', 'html', 'htm'].includes(extension || '');
}

/**
 * Returns true when one source is an HTTP(S) URL.
 */
function isHttpSource(source: string): boolean {
    return source.startsWith('http://') || source.startsWith('https://');
}

/**
 * Resolves a URL suitable for source chips.
 */
function resolveKnowledgeSourceUrl(source: string): string | undefined {
    return isHttpSource(source) ? source : undefined;
}

/**
 * Resolves a concise human-readable source title.
 */
function resolveKnowledgeSourceTitle(source: string): string {
    if (!isHttpSource(source)) {
        return source.length > 80 ? `${source.slice(0, 77)}...` : source;
    }

    try {
        const url = new URL(source);
        const pathname = decodeURIComponent(url.pathname);
        const lastPathSegment = pathname.split('/').filter(Boolean).pop();
        return lastPathSegment || url.hostname;
    } catch {
        return source;
    }
}

/**
 * Extracts a lowercase extension from URL path.
 */
function resolveSourceExtension(source: string): string | null {
    try {
        const url = new URL(source);
        const lastPathSegment = decodeURIComponent(url.pathname.split('/').pop() || '').toLowerCase();
        const lastDotIndex = lastPathSegment.lastIndexOf('.');

        if (lastDotIndex === -1 || lastDotIndex === lastPathSegment.length - 1) {
            return null;
        }

        return lastPathSegment.slice(lastDotIndex + 1);
    } catch {
        return null;
    }
}
