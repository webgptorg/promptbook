import { promptbookFetch } from '../../../scrapers/_common/utils/promptbookFetch';
import type { string_url } from '../../../types/typeAliases';
import { ProcessorFactory } from './processors/ProcessorFactory';
import type { KnowledgeChunk, KnowledgeSourceMetadata, RAGConfig, RetrievalResult } from './types';

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Handles knowledge source processing and retrieval
 *
 * @private
 */
export class RAGService {
    private knowledgeBase: {
        sources: KnowledgeSourceMetadata[];
        chunks: KnowledgeChunk[];
        lastUpdated: Date;
    };
    private config: RAGConfig;

    constructor(config?: Partial<RAGConfig>) {
        this.config = {
            maxChunkSize: 1000,
            chunkOverlap: 200,
            maxRetrievedChunks: 5,
            minRelevanceScore: 0.1,
            ...config,
        };

        this.knowledgeBase = {
            sources: [],
            chunks: [],
            lastUpdated: new Date(),
        };
    }

    /**
     * Add a knowledge source from URL
     */
    async addKnowledgeSource(url: string_url): Promise<void> {
        try {
            // Check if source already exists
            const existingSource = this.knowledgeBase.sources.find((source) => source.url === url);
            if (existingSource) {
                console.log(`Knowledge source already exists: ${url}`);
                return;
            }

            // Fetch the content
            const response = await promptbookFetch(url); // <- fetchKnowledgeSource
            if (!response.ok) {
                throw new Error(`Failed to fetch knowledge source: ${response.status} ${response.statusText}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            // Detect format and get appropriate processor
            const format = ProcessorFactory.detectFormat(url);
            const processor = ProcessorFactory.getProcessor(format, this.config);

            // Process the content into chunks
            const chunks = await processor.processBuffer(buffer, url);

            // Add to knowledge base
            this.knowledgeBase.sources.push({
                url,
                format,
                lastFetched: new Date(),
                contentHash: this.generateContentHash(buffer.toString()),
            });

            this.knowledgeBase.chunks.push(...chunks);
            this.knowledgeBase.lastUpdated = new Date();

            console.log(`Added knowledge source: ${url} (${chunks.length} chunks)`);
        } catch (error) {
            console.error(`Failed to add knowledge source ${url}:`, error);
            throw error;
        }
    }

    /**
     * Retrieve relevant chunks for a query
     */
    retrieveRelevantChunks(query: string): RetrievalResult[] {
        if (this.knowledgeBase.chunks.length === 0) {
            return [];
        }

        // Simple keyword-based relevance scoring
        // In a production system, this would use embeddings and vector similarity
        const queryWords = this.tokenizeQuery(query);
        const results: RetrievalResult[] = [];

        for (const chunk of this.knowledgeBase.chunks) {
            const relevanceScore = this.calculateRelevanceScore(chunk.content, queryWords);

            if (relevanceScore >= this.config.minRelevanceScore) {
                results.push({
                    chunk,
                    relevanceScore,
                });
            }
        }

        // Sort by relevance score (descending) and limit results
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, this.config.maxRetrievedChunks);
    }

    /**
     * Get formatted context for the agent
     */
    getContextForQuery(query: string): string {
        const relevantChunks = this.retrieveRelevantChunks(query);

        if (relevantChunks.length === 0) {
            return '';
        }

        const contextSections = relevantChunks.map((result, index) => {
            const { chunk }: { chunk: KnowledgeChunk } = result;
            const sourceInfo: string = chunk.metadata.pageNumber
                ? `(Page ${chunk.metadata.pageNumber})`
                : `(Chunk ${chunk.metadata.chunkIndex + 1}/${chunk.metadata.totalChunks})`;

            return `[Source ${index + 1}] ${sourceInfo}\n${chunk.content}`;
        });

        return `Based on the following knowledge sources:\n\n${contextSections.join('\n\n---\n\n')}`;
    }

    /**
     * Get knowledge base statistics
     */
    getStats(): { sources: number; chunks: number; lastUpdated: Date } {
        return {
            sources: this.knowledgeBase.sources.length,
            chunks: this.knowledgeBase.chunks.length,
            lastUpdated: this.knowledgeBase.lastUpdated,
        };
    }

    /**
     * Clear all knowledge sources
     */
    clearKnowledgeBase(): void {
        this.knowledgeBase = {
            sources: [],
            chunks: [],
            lastUpdated: new Date(),
        };
    }

    /**
     * Tokenize query into words for relevance scoring
     */
    private tokenizeQuery(query: string): string[] {
        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length > 2); // Filter out very short words
    }

    /**
     * Calculate relevance score between content and query words
     * Simple keyword matching - in production, use embeddings
     */
    private calculateRelevanceScore(content: string, queryWords: string[]): number {
        const contentLower = content.toLowerCase();
        let score = 0;
        const totalWords = queryWords.length;

        for (const word of queryWords) {
            // Count occurrences of each query word in the content
            const regex = new RegExp(`\\b${word}\\b`, 'g');
            const matches = contentLower.match(regex);
            if (matches) {
                score += matches.length / totalWords;
            }
        }

        // Normalize score to 0-1 range
        return Math.min(score, 1);
    }

    /**
     * Generate content hash for caching
     */
    private generateContentHash(content: string): string {
        // Simple hash function - in production, use crypto
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
}

/**
 * TODO: !!!! use the already existing RAG instead of this
 */
