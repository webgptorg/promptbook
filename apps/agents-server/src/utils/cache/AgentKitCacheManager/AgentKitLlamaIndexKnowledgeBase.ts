import type { Tool as AgentKitTool } from '@openai/agents';
import { tool as agentKitTool } from '@openai/agents';
import { BaseEmbedding, Document, MetadataMode, SentenceSplitter, Settings, VectorStoreIndex } from 'llamaindex';
import type { NodeWithScore } from 'llamaindex';
import type OpenAI from 'openai';
import { spaceTrim } from 'spacetrim';
import { KnowledgeScrapeError } from '../../../../../../src/errors/KnowledgeScrapeError';
import { UnexpectedError } from '../../../../../../src/errors/UnexpectedError';
import type { string_knowledge_source_link } from '../../../../../../src/types/typeAliases';
import {
    isDataUrlKnowledgeSource,
    parseDataUrlKnowledgeSource,
} from '../../../../../../src/utils/knowledge/inlineKnowledgeSource';

/**
 * Native AgentKit tool name used by Agents Server for `KNOWLEDGE` search.
 *
 * @private function of AgentKitCacheManager
 */
export const AGENT_KIT_KNOWLEDGE_SEARCH_TOOL_NAME = 'knowledge_search';

/**
 * Default embedding model used by LlamaIndex for Agents Server knowledge search.
 *
 * @private function of AgentKitCacheManager
 */
const DEFAULT_LLAMA_INDEX_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Maximum number of texts embedded in one OpenAI embeddings request.
 *
 * @private function of AgentKitCacheManager
 */
const LLAMA_INDEX_EMBEDDING_BATCH_SIZE = 64;

/**
 * Default number of LlamaIndex nodes returned for one knowledge search.
 *
 * @private function of AgentKitCacheManager
 */
const DEFAULT_KNOWLEDGE_SEARCH_LIMIT = 5;

/**
 * Maximum number of LlamaIndex nodes returned for one knowledge search.
 *
 * @private function of AgentKitCacheManager
 */
const MAX_KNOWLEDGE_SEARCH_LIMIT = 10;

/**
 * Chunk size passed into the LlamaIndex sentence splitter.
 *
 * @private function of AgentKitCacheManager
 */
const LLAMA_INDEX_CHUNK_SIZE = 1024;

/**
 * Chunk overlap passed into the LlamaIndex sentence splitter.
 *
 * @private function of AgentKitCacheManager
 */
const LLAMA_INDEX_CHUNK_OVERLAP = 128;

/**
 * Timeout for downloading one remote knowledge source before indexing.
 *
 * @private function of AgentKitCacheManager
 */
const KNOWLEDGE_SOURCE_FETCH_TIMEOUT_MS = 30_000;

/**
 * Maximum excerpt length returned to the model per retrieved chunk.
 *
 * @private function of AgentKitCacheManager
 */
const KNOWLEDGE_SEARCH_EXCERPT_MAX_LENGTH = 1_500;

/**
 * Source label used when a URL has no filename-like path segment.
 *
 * @private function of AgentKitCacheManager
 */
const FALLBACK_KNOWLEDGE_SOURCE_FILENAME = 'downloaded-file';

/**
 * Minimal MarkItDown conversion result used by the knowledge indexer.
 *
 * @private function of AgentKitCacheManager
 */
type MarkItDownConversionResult = {
    readonly markdown: string;
    readonly text_content?: string;
} | null | undefined;

/**
 * Minimal MarkItDown instance shape used by the knowledge indexer.
 *
 * @private function of AgentKitCacheManager
 */
type MarkItDownInstance = {
    convertBuffer(
        source: Buffer,
        options: {
            readonly file_extension: string;
        },
    ): Promise<MarkItDownConversionResult>;
};

/**
 * Metadata stored on LlamaIndex documents and inherited by retrieved chunks.
 *
 * @private function of AgentKitCacheManager
 */
type AgentKitLlamaIndexKnowledgeMetadata = {
    readonly source: string;
    readonly citationSource: string;
    readonly filename: string;
    readonly mimeType: string | null;
};

/**
 * One source materialized into model-searchable markdown/text.
 *
 * @private function of AgentKitCacheManager
 */
type MaterializedKnowledgeSource = AgentKitLlamaIndexKnowledgeMetadata & {
    readonly text: string;
};

/**
 * One formatted knowledge search result returned from LlamaIndex.
 *
 * @private function of AgentKitCacheManager
 */
export type AgentKitLlamaIndexKnowledgeSearchResult = {
    readonly content: string;
    readonly citationMarker: string;
    readonly citationSource: string;
    readonly source: string;
    readonly score: number | null;
};

/**
 * Creates a MarkItDown instance lazily so tests and cache-only paths do not load document parsers.
 *
 * @private function of AgentKitCacheManager
 */
async function createMarkItDown(): Promise<MarkItDownInstance> {
    const { MarkItDown } = (await import('markitdown-ts')) as {
        readonly MarkItDown: new () => MarkItDownInstance;
    };

    return new MarkItDown();
}

/**
 * Returns true when one source is an HTTP(S) knowledge source URL.
 *
 * @private function of AgentKitCacheManager
 */
function isHttpKnowledgeSource(source: string): boolean {
    return source.startsWith('http://') || source.startsWith('https://');
}

/**
 * Resolves a filename from a URL using the same broad fallback as the previous vector-store uploader.
 *
 * @private function of AgentKitCacheManager
 */
function resolveKnowledgeSourceFilenameFromUrl(source: string): string {
    let filename = source.split('/').pop() || FALLBACK_KNOWLEDGE_SOURCE_FILENAME;

    try {
        const url = new URL(source);
        filename = decodeURIComponent(url.pathname.split('/').pop() || filename);
    } catch {
        // Keep fallback filename.
    }

    return filename || FALLBACK_KNOWLEDGE_SOURCE_FILENAME;
}

/**
 * Resolves the source label the model should copy into OpenAI-style citation markers.
 *
 * @private function of AgentKitCacheManager
 */
function resolveCitationSource(options: { readonly source: string; readonly filename: string }): string {
    const { source, filename } = options;

    if (filename && filename !== FALLBACK_KNOWLEDGE_SOURCE_FILENAME) {
        return filename;
    }

    return source;
}

/**
 * Extracts the lowercase extension, including the leading dot, from one filename or URL.
 *
 * @private function of AgentKitCacheManager
 */
function getKnowledgeSourceExtension(value: string): string | null {
    const cleanValue = value.split('?')[0]?.split('#')[0] ?? value;
    const lastPathSegment = cleanValue.split('/').pop() ?? cleanValue;
    const extensionStartIndex = lastPathSegment.lastIndexOf('.');

    if (extensionStartIndex <= 0 || extensionStartIndex === lastPathSegment.length - 1) {
        return null;
    }

    return lastPathSegment.slice(extensionStartIndex).toLowerCase();
}

/**
 * Resolves a conservative file extension from MIME type when the filename has none.
 *
 * @private function of AgentKitCacheManager
 */
function resolveExtensionFromMimeType(mimeType: string | null): string | null {
    const normalizedMimeType = mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';

    switch (normalizedMimeType) {
        case 'application/json':
            return '.json';
        case 'application/pdf':
            return '.pdf';
        case 'application/xhtml+xml':
        case 'text/html':
            return '.html';
        case 'text/csv':
            return '.csv';
        case 'text/markdown':
        case 'text/x-markdown':
            return '.md';
        case 'text/plain':
            return '.txt';
        case 'text/xml':
        case 'application/xml':
            return '.xml';
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return '.docx';
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return '.xlsx';
        default:
            return null;
    }
}

/**
 * Resolves the MarkItDown file extension for a buffered source.
 *
 * @private function of AgentKitCacheManager
 */
function resolveKnowledgeSourceExtension(options: {
    readonly filename: string;
    readonly source: string;
    readonly mimeType: string | null;
}): string | null {
    return (
        getKnowledgeSourceExtension(options.filename) ||
        getKnowledgeSourceExtension(options.source) ||
        resolveExtensionFromMimeType(options.mimeType)
    );
}

/**
 * Returns true when a failed conversion can still fall back to UTF-8 text.
 *
 * @private function of AgentKitCacheManager
 */
function isLikelyTextKnowledgeSource(options: { readonly filename: string; readonly mimeType: string | null }): boolean {
    const normalizedMimeType = options.mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';

    if (normalizedMimeType.startsWith('text/') || normalizedMimeType === 'application/json') {
        return true;
    }

    const extension = getKnowledgeSourceExtension(options.filename);

    return extension !== null && ['.csv', '.json', '.md', '.txt', '.xml', '.yaml', '.yml'].includes(extension);
}

/**
 * Converts one source buffer into markdown using MarkItDown, with a text fallback for text-like files.
 *
 * @private function of AgentKitCacheManager
 */
async function convertKnowledgeSourceBufferToText(options: {
    readonly markItDown: MarkItDownInstance;
    readonly buffer: Buffer;
    readonly filename: string;
    readonly source: string;
    readonly mimeType: string | null;
}): Promise<string> {
    const extension = resolveKnowledgeSourceExtension(options);

    if (extension) {
        try {
            const conversionResult = await options.markItDown.convertBuffer(options.buffer, {
                file_extension: extension,
            });
            const markdown = conversionResult?.markdown?.trim() || conversionResult?.text_content?.trim();

            if (markdown) {
                return markdown;
            }
        } catch (error) {
            if (!isLikelyTextKnowledgeSource(options)) {
                throw new KnowledgeScrapeError(
                    spaceTrim(
                        (block) => `
                            Failed to convert knowledge source \`${options.filename}\` with MarkItDown.

                            ${block(String(error))}
                        `,
                    ),
                );
            }
        }
    }

    if (isLikelyTextKnowledgeSource(options)) {
        return options.buffer.toString('utf-8').trim();
    }

    throw new KnowledgeScrapeError(
        `Failed to convert knowledge source \`${options.filename}\` because its file type is unsupported.`,
    );
}

/**
 * Fetches one remote knowledge source into memory.
 *
 * @private function of AgentKitCacheManager
 */
async function fetchKnowledgeSourceBuffer(source: string): Promise<{
    readonly buffer: Buffer;
    readonly mimeType: string | null;
}> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), KNOWLEDGE_SOURCE_FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(source, { signal: controller.signal });

        if (!response.ok) {
            throw new KnowledgeScrapeError(
                `Failed to download knowledge source \`${source}\` with status \`${response.status}\`.`,
            );
        }

        return {
            buffer: Buffer.from(await response.arrayBuffer()),
            mimeType: response.headers.get('content-type'),
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Materializes one `KNOWLEDGE` source into searchable markdown/text.
 *
 * @private function of AgentKitCacheManager
 */
async function materializeKnowledgeSource(options: {
    readonly source: string_knowledge_source_link;
    readonly markItDown: MarkItDownInstance;
}): Promise<MaterializedKnowledgeSource | null> {
    const { source, markItDown } = options;
    let buffer: Buffer;
    let filename: string;
    let mimeType: string | null;

    if (isDataUrlKnowledgeSource(source)) {
        const parsed = parseDataUrlKnowledgeSource(source);

        if (!parsed) {
            return null;
        }

        buffer = parsed.buffer;
        filename = parsed.filename;
        mimeType = parsed.mimeType;
    } else if (isHttpKnowledgeSource(source)) {
        const fetchedSource = await fetchKnowledgeSourceBuffer(source);
        buffer = fetchedSource.buffer;
        filename = resolveKnowledgeSourceFilenameFromUrl(source);
        mimeType = fetchedSource.mimeType;
    } else {
        return null;
    }

    const text = await convertKnowledgeSourceBufferToText({
        markItDown,
        buffer,
        filename,
        source,
        mimeType,
    });
    const normalizedText = text.trim();

    if (!normalizedText) {
        return null;
    }

    return {
        text: normalizedText,
        source,
        citationSource: resolveCitationSource({ source, filename }),
        filename,
        mimeType,
    };
}

/**
 * Materializes all knowledge sources that can be indexed locally.
 *
 * @private function of AgentKitCacheManager
 */
async function materializeKnowledgeSources(options: {
    readonly knowledgeSources: ReadonlyArray<string_knowledge_source_link>;
    readonly isVerbose: boolean;
}): Promise<ReadonlyArray<MaterializedKnowledgeSource>> {
    const markItDown = await createMarkItDown();
    const materializedSources: MaterializedKnowledgeSource[] = [];

    for (const source of options.knowledgeSources) {
        try {
            const materializedSource = await materializeKnowledgeSource({ source, markItDown });

            if (materializedSource) {
                materializedSources.push(materializedSource);
            }
        } catch (error) {
            if (options.isVerbose) {
                console.warn('[knowledge] Failed to prepare source for LlamaIndex search', {
                    source,
                    error,
                });
            }
        }
    }

    return materializedSources;
}

/**
 * Truncates one retrieved chunk for tool output.
 *
 * @private function of AgentKitCacheManager
 */
function truncateKnowledgeSearchExcerpt(content: string): string {
    const normalizedContent = content.trim();

    if (normalizedContent.length <= KNOWLEDGE_SEARCH_EXCERPT_MAX_LENGTH) {
        return normalizedContent;
    }

    return `${normalizedContent.slice(0, KNOWLEDGE_SEARCH_EXCERPT_MAX_LENGTH).trimEnd()}...`;
}

/**
 * Normalizes an optional model-provided result limit.
 *
 * @private function of AgentKitCacheManager
 */
function normalizeKnowledgeSearchLimit(limit: unknown): number {
    const numericLimit = typeof limit === 'number' ? limit : Number.parseInt(String(limit ?? ''), 10);

    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
        return DEFAULT_KNOWLEDGE_SEARCH_LIMIT;
    }

    return Math.min(Math.floor(numericLimit), MAX_KNOWLEDGE_SEARCH_LIMIT);
}

/**
 * Adapts OpenAI embeddings to the LlamaIndex embedding interface.
 *
 * @private function of AgentKitCacheManager
 */
class OpenAiLlamaIndexEmbedding extends BaseEmbedding {
    private readonly client: OpenAI;
    private readonly model: string;

    /**
     * Creates an OpenAI-backed LlamaIndex embedding model.
     */
    public constructor(options: { readonly client: OpenAI; readonly model?: string }) {
        super();
        this.client = options.client;
        this.model = options.model ?? DEFAULT_LLAMA_INDEX_EMBEDDING_MODEL;
        this.embedBatchSize = LLAMA_INDEX_EMBEDDING_BATCH_SIZE;
    }

    /**
     * Gets one text embedding.
     */
    public async getTextEmbedding(text: string): Promise<number[]> {
        const embeddings = await this.getTextEmbeddings([text]);
        const embedding = embeddings[0];

        if (!embedding) {
            throw new UnexpectedError(`OpenAI returned no embedding for the LlamaIndex query text.`);
        }

        return embedding;
    }

    /**
     * Gets multiple text embeddings in one OpenAI request.
     */
    public override getTextEmbeddings = async (texts: string[]): Promise<Array<number[]>> => {
        if (texts.length === 0) {
            return [];
        }

        const response = await this.client.embeddings.create({
            model: this.model,
            input: texts,
        });

        return response.data.map((embedding) => embedding.embedding);
    };
}

/**
 * LlamaIndex-backed searchable knowledge base for one prepared AgentKit agent.
 *
 * @private function of AgentKitCacheManager
 */
export class AgentKitLlamaIndexKnowledgeBase {
    private readonly index: VectorStoreIndex | null;

    /**
     * Creates a searchable knowledge base.
     */
    private constructor(index: VectorStoreIndex | null) {
        this.index = index;
    }

    /**
     * Builds a LlamaIndex vector index from materialized `KNOWLEDGE` sources.
     */
    public static async create(options: {
        readonly client: OpenAI;
        readonly knowledgeSources: ReadonlyArray<string_knowledge_source_link>;
        readonly isVerbose: boolean;
    }): Promise<AgentKitLlamaIndexKnowledgeBase> {
        const materializedSources = await materializeKnowledgeSources({
            knowledgeSources: options.knowledgeSources,
            isVerbose: options.isVerbose,
        });

        if (materializedSources.length === 0) {
            return new AgentKitLlamaIndexKnowledgeBase(null);
        }

        const documents = materializedSources.map(
            (source) =>
                new Document<AgentKitLlamaIndexKnowledgeMetadata>({
                    text: source.text,
                    metadata: {
                        source: source.source,
                        citationSource: source.citationSource,
                        filename: source.filename,
                        mimeType: source.mimeType,
                    },
                    excludedEmbedMetadataKeys: ['source', 'citationSource', 'filename', 'mimeType'],
                    excludedLlmMetadataKeys: ['source', 'citationSource', 'filename', 'mimeType'],
                }),
        );
        const embeddingModel = new OpenAiLlamaIndexEmbedding({ client: options.client });
        const sentenceSplitter = new SentenceSplitter({
            chunkSize: LLAMA_INDEX_CHUNK_SIZE,
            chunkOverlap: LLAMA_INDEX_CHUNK_OVERLAP,
        });
        const index = await Settings.withEmbedModel(embeddingModel, () =>
            Settings.withNodeParser(sentenceSplitter, () =>
                VectorStoreIndex.fromDocuments(documents, {
                    logProgress: options.isVerbose,
                }),
            ),
        );

        return new AgentKitLlamaIndexKnowledgeBase(index);
    }

    /**
     * Searches the indexed knowledge sources.
     */
    public async search(options: {
        readonly query: string;
        readonly limit?: number;
    }): Promise<ReadonlyArray<AgentKitLlamaIndexKnowledgeSearchResult>> {
        if (!this.index) {
            return [];
        }

        const limit = normalizeKnowledgeSearchLimit(options.limit);
        const retriever = this.index.asRetriever({ similarityTopK: limit });
        const nodes = await retriever.retrieve(options.query);

        return nodes.slice(0, limit).map((node, index) => this.mapNodeToSearchResult(node, index));
    }

    /**
     * Maps one LlamaIndex node to model-facing search result metadata.
     */
    private mapNodeToSearchResult(
        nodeWithScore: NodeWithScore,
        index: number,
    ): AgentKitLlamaIndexKnowledgeSearchResult {
        const metadata = nodeWithScore.node.metadata as Partial<AgentKitLlamaIndexKnowledgeMetadata>;
        const source = typeof metadata.source === 'string' ? metadata.source : '';
        const filename = typeof metadata.filename === 'string' ? metadata.filename : source;
        const citationSource =
            typeof metadata.citationSource === 'string' && metadata.citationSource.trim()
                ? metadata.citationSource
                : filename;

        return {
            content: truncateKnowledgeSearchExcerpt(nodeWithScore.node.getContent(MetadataMode.NONE)),
            citationMarker: `【${index + 1}:0†${citationSource}】`,
            citationSource,
            source,
            score: typeof nodeWithScore.score === 'number' ? nodeWithScore.score : null,
        };
    }
}

/**
 * Formats LlamaIndex search results for the AgentKit function-tool response.
 *
 * @private function of AgentKitCacheManager
 */
export function formatAgentKitLlamaIndexKnowledgeSearchResults(
    results: ReadonlyArray<AgentKitLlamaIndexKnowledgeSearchResult>,
): string {
    if (results.length === 0) {
        return 'No matching knowledge was found in the indexed KNOWLEDGE sources.';
    }

    return results
        .map((result, index) =>
            spaceTrim(
                (block) => `
                    Result ${index + 1}
                    Citation: ${result.citationMarker}
                    Source: ${result.citationSource}
                    ${block(result.score === null ? '' : `Score: ${result.score.toFixed(4)}`)}

                    Excerpt:
                    ${block(result.content)}
                `,
            ),
        )
        .join('\n\n');
}

/**
 * Creates the native AgentKit function tool that exposes LlamaIndex knowledge search.
 *
 * @private function of AgentKitCacheManager
 */
export function createAgentKitLlamaIndexKnowledgeTool(
    knowledgeBase: AgentKitLlamaIndexKnowledgeBase,
): AgentKitTool {
    return agentKitTool({
        name: AGENT_KIT_KNOWLEDGE_SEARCH_TOOL_NAME,
        description: spaceTrim(
            `
                Search the agent's KNOWLEDGE sources through the local LlamaIndex knowledge index.
                Use this before answering questions that may depend on uploaded or linked knowledge.
                When using a result in the final answer, copy its Citation marker exactly.
            `,
        ),
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The focused knowledge search query.',
                },
                limit: {
                    type: 'number',
                    description: `Optional number of results to return, up to ${MAX_KNOWLEDGE_SEARCH_LIMIT}.`,
                },
            },
            required: ['query'],
            additionalProperties: true,
        },
        strict: false,
        execute: async (input) => {
            const normalizedInput =
                input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
            const query = typeof normalizedInput.query === 'string' ? normalizedInput.query.trim() : '';

            if (!query) {
                return 'Knowledge search requires a non-empty `query`.';
            }

            const results = await knowledgeBase.search({
                query,
                limit: normalizeKnowledgeSearchLimit(normalizedInput.limit),
            });

            return formatAgentKitLlamaIndexKnowledgeSearchResults(results);
        },
    });
}
