import type { ParsedCommitment } from '../../../commitments/_base/ParsedCommitment';

/**
 * Resolves the public agent profile text from the last GOAL/GOALS commitment,
 * falling back to the deprecated PERSONA/PERSONAE commitments when no goal exists.
 *
 * @private internal utility of `parseAgentSource`
 */
export function extractAgentProfileText(commitments: ReadonlyArray<ParsedCommitment>): string | null {
    let goalDescription = '';
    let hasGoalDescription = false;
    let personaDescription = '';
    let hasPersonaDescription = false;

    for (const commitment of commitments) {
        if (commitment.type === 'GOAL' || commitment.type === 'GOALS') {
            goalDescription = commitment.content;
            hasGoalDescription = true;
        }

        if (commitment.type === 'PERSONA' || commitment.type === 'PERSONAE') {
            personaDescription = commitment.content;
            hasPersonaDescription = true;
        }
    }

    if (hasGoalDescription) {
        return goalDescription;
    }

    if (hasPersonaDescription) {
        return personaDescription;
    }

    return null;
}
