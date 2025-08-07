import type { string_url } from '../../../types/typeAliases';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { KnowledgeChunk, RAGConfig, RetrievalResult } from './types';

/**
 * Frontend RAG Service that uses backend APIs for processing
 * This avoids Node.js dependencies in the frontend
 */
export class FrontendRAGService {
    private chunks: KnowledgeChunk[] = [];
    private sources: string_url[] = [];
    private config: RAGConfig;
    private isInitialized = false;

    constructor(config?: Partial<RAGConfig>) {
        this.config = {
            maxChunkSize: 1000,
            chunkOverlap: 200,
            maxRetrievedChunks: 5,
            minRelevanceScore: 0.1,
            ...config,
        };
    }

    /**
     * Initialize knowledge sources by processing them on the backend
     */
    async initializeKnowledgeSources(sources: string_url[]): Promise<void> {
        if (sources.length === 0) {
            this.isInitialized = true;
            return;
        }

        try {
            const response = await promptbookFetch('/api/knowledge/process-sources', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sources,
                    config: {
                        maxChunkSize: this.config.maxChunkSize,
                        chunkOverlap: this.config.chunkOverlap,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to process knowledge sources: ${response.status}`);
            }

            const result = (await response.json()) as TODO_any;

            if (!result.success) {
                throw new Error(result.message || 'Failed to process knowledge sources');
            }

            this.chunks = result.chunks;
            this.sources = sources;
            this.isInitialized = true;

            console.log(`Initialized RAG service with ${this.chunks.length} chunks from ${sources.length} sources`);
        } catch (error) {
            console.error('Failed to initialize knowledge sources:', error);
            // Don't throw - allow the system to continue without RAG
            this.isInitialized = true;
        }
    }

    /**
     * Get relevant context for a user query
     */
    async getContextForQuery(query: string): Promise<string> {
        if (!this.isInitialized) {
            console.warn('RAG service not initialized');
            return '';
        }

        if (this.chunks.length === 0) {
            return '';
        }

        try {
            const response = await promptbookFetch('/api/knowledge/retrieve-context', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    chunks: this.chunks,
                    config: {
                        maxRetrievedChunks: this.config.maxRetrievedChunks,
                        minRelevanceScore: this.config.minRelevanceScore,
                    },
                }),
            });

            if (!response.ok) {
                console.error(`Failed to retrieve context: ${response.status}`);
                return '';
            }

            const result = (await response.json()) as TODO_any;

            if (!result.success) {
                console.error('Context retrieval failed:', result.message);
                return '';
            }

            return result.context;
        } catch (error) {
            console.error('Error retrieving context:', error);
            return '';
        }
    }

    /**
     * Get relevant chunks for a query (for debugging/inspection)
     */
    async getRelevantChunks(query: string): Promise<RetrievalResult[]> {
        if (!this.isInitialized || this.chunks.length === 0) {
            return [];
        }

        try {
            const response = await promptbookFetch('/api/knowledge/retrieve-context', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    chunks: this.chunks,
                    config: {
                        maxRetrievedChunks: this.config.maxRetrievedChunks,
                        minRelevanceScore: this.config.minRelevanceScore,
                    },
                }),
            });

            if (!response.ok) {
                return [];
            }

            const result = (await response.json()) as TODO_any;
            return result.success ? result.relevantChunks : [];
        } catch (error) {
            console.error('Error retrieving relevant chunks:', error);
            return [];
        }
    }

    /**
     * Get knowledge base statistics
     */
    getStats(): { sources: number; chunks: number; isInitialized: boolean } {
        return {
            sources: this.sources.length,
            chunks: this.chunks.length,
            isInitialized: this.isInitialized,
        };
    }

    /**
     * Check if the service is ready to use
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Clear all knowledge sources
     */
    clearKnowledgeBase(): void {
        this.chunks = [];
        this.sources = [];
        this.isInitialized = false;
    }

    /**
     * Add a single knowledge source (for incremental updates)
     */
    async addKnowledgeSource(url: string_url): Promise<void> {
        if (this.sources.includes(url)) {
            console.log(`Knowledge source already exists: ${url}`);
            return;
        }

        try {
            const response = await promptbookFetch('/api/knowledge/process-sources', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sources: [url],
                    config: {
                        maxChunkSize: this.config.maxChunkSize,
                        chunkOverlap: this.config.chunkOverlap,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to process knowledge source: ${response.status}`);
            }

            const result = (await response.json()) as TODO_any;

            if (!result.success) {
                throw new Error(result.message || 'Failed to process knowledge source');
            }

            // Add new chunks to existing ones
            this.chunks.push(...result.chunks);
            this.sources.push(url);

            console.log(`Added knowledge source: ${url} (${result.chunks.length} chunks)`);
        } catch (error) {
            console.error(`Failed to add knowledge source ${url}:`, error);
            throw error;
        }
    }
}
