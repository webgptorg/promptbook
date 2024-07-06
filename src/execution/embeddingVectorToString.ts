import { EmbeddingVector } from './EmbeddingVector';

/**
 * Pretty print an embedding vector for logging
 */
export function embeddingVectorToString(embeddingVector: EmbeddingVector) {
    const vectorLength = embeddingVector.reduce((acc, val) => acc + val ** 2, 0) ** 0.5;

    return `[EmbeddingVector; ${embeddingVector.length} dimensions; length: ${vectorLength.toFixed(
        2,
    )}; ${embeddingVector.slice(0, 3).join(', ')}...]`;
}
