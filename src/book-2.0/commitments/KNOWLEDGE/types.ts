import type { string_url } from '../../../utils/typeAliases';

/**
 * Supported knowledge source formats
 */
export type KnowledgeSourceFormat = 'pdf' | 'text' | 'markdown' | 'html';

/**
 * Knowledge source metadata
 */
export interface KnowledgeSourceMetadata {
    readonly url: string_url;
    readonly format: KnowledgeSourceFormat;
    readonly title?: string;
    readonly lastFetched?: Date;
    readonly contentHash?: string;
}

/**
 * Processed knowledge chunk for RAG
 */
export interface KnowledgeChunk {
    readonly id: string;
    readonly sourceUrl: string_url;
    readonly content: string;
    readonly metadata: {
        readonly pageNumber?: number;
        readonly section?: string;
        readonly chunkIndex: number;
        readonly totalChunks: number;
    };
}

/**
 * Knowledge base containing all processed knowledge sources
 */
export interface KnowledgeBase {
    readonly sources: KnowledgeSourceMetadata[];
    readonly chunks: KnowledgeChunk[];
    readonly lastUpdated: Date;
}

/**
 * RAG retrieval result
 */
export interface RetrievalResult {
    readonly chunk: KnowledgeChunk;
    readonly relevanceScore: number;
}

/**
 * Configuration for RAG processing
 */
export interface RAGConfig {
    readonly maxChunkSize: number;
    readonly chunkOverlap: number;
    readonly maxRetrievedChunks: number;
    readonly minRelevanceScore: number;
}


/**
 * [💞] Ignore a discrepancy between file name and entity name
 */
