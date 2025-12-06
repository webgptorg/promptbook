import { $deepFreeze } from '../utils/serialization/$deepFreeze';
import type { BookCommitment } from './_base/BookCommitment';
import type { CommitmentDefinition } from './_base/CommitmentDefinition';
import { NotYetImplementedCommitmentDefinition } from './_base/NotYetImplementedCommitmentDefinition';

/**
 * Registry of all available commitment definitions
 * This array contains instances of all commitment definitions
 * This is the single source of truth for all commitments in the system
 *
 * @private Use functions to access commitments instead of this array directly
 */
export const COMMITMENT_REGISTRY: CommitmentDefinition[] = [];

/**
 * Registers a new commitment definition
 * @param definition The commitment definition to register
 *
 * @public exported from `@promptbook/core`
 */
export function registerCommitment(definition: CommitmentDefinition): void {
    COMMITMENT_REGISTRY.push(definition);
}

/**
 * Gets a commitment definition by its type
 * @param type The commitment type to look up
 * @returns The commitment definition or null if not found
 *
 * @public exported from `@promptbook/core`
 */
export function getCommitmentDefinition(type: BookCommitment): CommitmentDefinition | null {
    return COMMITMENT_REGISTRY.find((commitmentDefinition) => commitmentDefinition.type === type) || null;
}

/**
 * Gets all available commitment definitions
 * @returns Array of all commitment definitions
 *
 * @public exported from `@promptbook/core`
 */
export function getAllCommitmentDefinitions(): ReadonlyArray<CommitmentDefinition> {
    return $deepFreeze([...COMMITMENT_REGISTRY]);
}

/**
 * Gets all available commitment types
 * @returns Array of all commitment types
 *
 * @public exported from `@promptbook/core`
 */
export function getAllCommitmentTypes(): ReadonlyArray<BookCommitment> {
    return $deepFreeze(
        COMMITMENT_REGISTRY.map((commitmentDefinition) => commitmentDefinition.type),
    ) as ReadonlyArray<BookCommitment>;
}

/**
 * Checks if a commitment type is supported
 * @param type The commitment type to check
 * @returns True if the commitment type is supported
 *
 * @public exported from `@promptbook/core`
 */
export function isCommitmentSupported(type: BookCommitment): boolean {
    return COMMITMENT_REGISTRY.some((commitmentDefinition) => commitmentDefinition.type === type);
}

/**
 * Grouped commitment definition
 *
 * @public exported from `@promptbook/core`
 */
export type GroupedCommitmentDefinition = {
    primary: CommitmentDefinition;
    aliases: string[];
};

/**
 * Gets all commitment definitions grouped by their aliases
 *
 * @returns Array of grouped commitment definitions
 *
 * @public exported from `@promptbook/core`
 */
export function getGroupedCommitmentDefinitions(): ReadonlyArray<GroupedCommitmentDefinition> {
    const groupedCommitments: GroupedCommitmentDefinition[] = [];

    for (const commitment of COMMITMENT_REGISTRY) {
        const lastGroup = groupedCommitments[groupedCommitments.length - 1];

        // Check if we should group with the previous item
        let shouldGroup = false;

        if (lastGroup) {
            const lastPrimary = lastGroup.primary;

            // Case 1: Same class constructor (except NotYetImplemented)
            if (
                !(commitment instanceof NotYetImplementedCommitmentDefinition) &&
                commitment.constructor === lastPrimary.constructor
            ) {
                shouldGroup = true;
            }
            // Case 2: NotYetImplemented with prefix matching (e.g. BEHAVIOUR -> BEHAVIOURS)
            else if (
                commitment instanceof NotYetImplementedCommitmentDefinition &&
                lastPrimary instanceof NotYetImplementedCommitmentDefinition &&
                commitment.type.startsWith(lastPrimary.type)
            ) {
                shouldGroup = true;
            }
            // Case 3: OPEN and CLOSED are related
            else if (lastPrimary.type === 'OPEN' && commitment.type === 'CLOSED') {
                shouldGroup = true;
            }
        }

        if (shouldGroup && lastGroup) {
            lastGroup.aliases.push(commitment.type);
        } else {
            groupedCommitments.push({
                primary: commitment,
                aliases: [],
            });
        }
    }

    return $deepFreeze(groupedCommitments);
}

/**
 * TODO: !!!! Proofread this file
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
