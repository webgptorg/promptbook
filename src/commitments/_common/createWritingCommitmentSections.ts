import { spaceTrim } from 'spacetrim';

/**
 * Creates the canonical system-message body for one writing-sample commitment.
 *
 * @param content - Explicit 1:1 sample text.
 * @returns Writing-sample guidance ready for one system-message section.
 *
 * @private internal utility of writing commitments
 */
export function createWritingSampleSection(content: string): string {
    return spaceTrim(`
        Use this as a 1:1 voice exemplar for how your replies should sound.
        Treat it as sample-only guidance for voice, cadence, phrasing, and emotional texture, not as task-solving instructions.
        If multiple writing samples exist, newer samples have higher weight than older ones.
        If explicit writing rules conflict with this sample, follow the writing rules for the conflicting constraint while keeping the sample as the primary voice exemplar.

        ${content}
    `);
}

/**
 * Creates the canonical system-message body for one writing-rules commitment.
 *
 * @param content - Writing-only instructions.
 * @returns Writing-rules guidance ready for one system-message section.
 *
 * @private internal utility of writing commitments
 */
export function createWritingRulesSection(content: string): string {
    return spaceTrim(`
        These instructions apply only to how you write: tone, formatting, length, emoji usage, punctuation, and similar presentation choices.
        They do not change your task-solving behavior, business logic, or factual decision-making rules.
        If multiple writing-rules blocks conflict, prefer the newer writing-rules blocks.
        If a writing rule conflicts with a writing sample, follow the explicit writing rule while keeping the writing sample as the primary voice exemplar.

        ${content}
    `);
}

// Note: [💞] Ignore a discrepancy between file name and entity name
