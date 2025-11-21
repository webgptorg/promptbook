import type { BookCommitment } from '../../commitments/_base/BookCommitment';

/**
 * Generates a regex pattern to match a specific commitment
 *
 * Note: It always creates new Regex object
 * Note: Uses word boundaries to ensure only full words are matched (e.g., "PERSONA" matches but "PERSONALITY" does not)
 *
 * @private - TODO: [🧠] Maybe should be public?
 */
export function createCommitmentRegex(commitment: BookCommitment): RegExp {
    const escapedCommitment = commitment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keywordPattern = escapedCommitment.split(/\s+/).join('\\s+');
    const regex = new RegExp(`^\\s*(?<type>${keywordPattern})\\b\\s+(?<contents>.+)$`, 'gim');
    return regex;
}

/**
 * Generates a regex pattern to match a specific commitment type
 *
 * Note: It just matches the type part of the commitment
 * Note: It always creates new Regex object
 * Note: Uses word boundaries to ensure only full words are matched (e.g., "PERSONA" matches but "PERSONALITY" does not)
 *
 * @private
 */
export function createCommitmentTypeRegex(commitment: BookCommitment): RegExp {
    const escapedCommitment = commitment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keywordPattern = escapedCommitment.split(/\s+/).join('\\s+');
    const regex = new RegExp(`^\\s*(?<type>${keywordPattern})\\b`, 'gim');
    return regex;
}
