import crypto from 'crypto';
import type { TODO_any } from '../../../../utils/organization/TODO_any';
import type { string_url } from '../../../../types/typeAliases';
import type { KnowledgeChunk } from '../types';
import type { KnowledgeSourceFormat } from '../types';
import type { RAGConfig } from '../types';

/**
 * Base class for knowledge source processors
 * Provides common functionality for all knowledge processors
 */
export abstract class BaseKnowledgeProcessor {
    protected readonly config: RAGConfig;

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
     * The format this processor supports
     */
    abstract readonly supportedFormat: KnowledgeSourceFormat;

    /**
     * Process a buffer and return knowledge chunks
     */
    abstract processBuffer(buffer: Buffer, sourceUrl: string_url): Promise<KnowledgeChunk[]>;

    /**
     * Generate a content hash for caching purposes
     */
    protected generateContentHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Generate a unique chunk ID
     */
    protected generateChunkId(sourceUrl: string_url, chunkIndex: number): string {
        const urlHash = crypto.createHash('md5').update(sourceUrl).digest('hex').slice(0, 8);
        return `${urlHash}_chunk_${chunkIndex}`;
    }

    /**
     * Split text into sentences for better chunking
     */
    protected splitIntoSentences(text: string): string[] {
        // Simple sentence splitting - can be enhanced with more sophisticated NLP
        return text
            .split(/[.!?]+/)
            .map((sentence) => sentence.trim())
            .filter((sentence) => sentence.length > 0)
            .map((sentence) => sentence + '.');
    }

    /**
     * Get overlap text from the end of current chunk
     */
    protected getOverlapText(text: string, overlapSize: number): string {
        if (text.length <= overlapSize) {
            return text + ' ';
        }

        const overlapText = text.slice(-overlapSize);
        // Try to start from a word boundary
        const spaceIndex = overlapText.indexOf(' ');
        if (spaceIndex > 0) {
            return overlapText.slice(spaceIndex + 1) + ' ';
        }

        return overlapText + ' ';
    }

    /**
     * Create chunks from text with proper overlap handling
     */
    protected createChunksFromText(
        text: string,
        sourceUrl: string_url,
        additionalMetadata: Record<string, TODO_any> = {},
    ): KnowledgeChunk[] {
        const chunks: KnowledgeChunk[] = [];
        const maxChunkSize = this.config.maxChunkSize;
        const chunkOverlap = this.config.chunkOverlap;

        // Split text into sentences for better chunking
        const sentences = this.splitIntoSentences(text);
        let currentChunk = '';
        let chunkIndex = 0;

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

            if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
                // Create chunk from current content
                chunks.push({
                    id: this.generateChunkId(sourceUrl, chunkIndex),
                    sourceUrl,
                    content: currentChunk.trim(),
                    metadata: {
                        chunkIndex,
                        totalChunks: 0, // Will be updated later
                        ...additionalMetadata,
                    },
                });

                // Start new chunk with overlap
                const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
                currentChunk = overlapText + sentence;
                chunkIndex++;
            } else {
                currentChunk = potentialChunk;
            }
        }

        // Add final chunk if there's remaining content
        if (currentChunk.trim()) {
            chunks.push({
                id: this.generateChunkId(sourceUrl, chunkIndex),
                sourceUrl,
                content: currentChunk.trim(),
                metadata: {
                    chunkIndex,
                    totalChunks: 0, // Will be updated below
                    ...additionalMetadata,
                },
            });
        }

        // Update total chunks count
        const totalChunks = chunks.length;
        return chunks.map((chunk) => ({
            ...chunk,
            metadata: {
                ...chunk.metadata,
                totalChunks,
            },
        }));
    }
}
