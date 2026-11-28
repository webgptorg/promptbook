import type { EmbeddingVector } from '../EmbeddingVector';

/**
 * Computes the cosine similarity between two embedding vectors
 *
 * Note: This is helping function for RAG (retrieval-augmented generation)
 *
 * @param embeddingVector1
 * @param embeddingVector2
 * @returns Cosine similarity between the two vectors
 *
 * @public exported from `@promptbook/core`
 */
export function computeCosineSimilarity(embeddingVector1: EmbeddingVector, embeddingVector2: EmbeddingVector): number {
    if (embeddingVector1.length !== embeddingVector2.length) {
        throw new TypeError('Embedding vectors must have the same length');
    }

    const dotProduct = embeddingVector1.reduce((sum, value, index) => sum + value * embeddingVector2[index]!, 0);
    const magnitude1 = Math.sqrt(embeddingVector1.reduce((sum, value) => sum + value * value, 0));
    const magnitude2 = Math.sqrt(embeddingVector2.reduce((sum, value) => sum + value * value, 0));

    return 1 - dotProduct / (magnitude1 * magnitude2);
}
