import type { BookCommitment } from './_base/BookCommitment';
import type { CommitmentDefinition } from './_base/CommitmentDefinition';

// Import all commitment definition classes
import { ActionCommitmentDefinition } from './ACTION/ACTION';
import { FormatCommitmentDefinition } from './FORMAT/FORMAT';
import { KnowledgeCommitmentDefinition } from './KNOWLEDGE/KNOWLEDGE';
import { MetaImageCommitmentDefinition } from './META_IMAGE/META_IMAGE';
import { MetaLinkCommitmentDefinition } from './META_LINK/META_LINK';
import { ModelCommitmentDefinition } from './MODEL/MODEL';
import { NoteCommitmentDefinition } from './NOTE/NOTE';
import { PersonaCommitmentDefinition } from './PERSONA/PERSONA';
import { RuleCommitmentDefinition } from './RULE/RULE';
import { SampleCommitmentDefinition } from './SAMPLE/SAMPLE';
import { StyleCommitmentDefinition } from './STYLE/STYLE';
import { NotYetImplementedCommitmentDefinition } from './_base/NotYetImplementedCommitmentDefinition';

/**
 * Registry of all available commitment definitions
 * This array contains instances of all commitment definitions
 * This is the single source of truth for all commitments in the system
 *
 * @private TODO: Maybe should be public?
 */
export const COMMITMENT_REGISTRY: Array<CommitmentDefinition> = [
    // Fully implemented commitments
    new PersonaCommitmentDefinition(),
    new KnowledgeCommitmentDefinition(),
    new StyleCommitmentDefinition(),
    new RuleCommitmentDefinition('RULE'),
    new RuleCommitmentDefinition('RULES'),
    new SampleCommitmentDefinition('SAMPLE'),
    new SampleCommitmentDefinition('EXAMPLE'),
    new FormatCommitmentDefinition(),
    new ModelCommitmentDefinition(),
    new ActionCommitmentDefinition(),
    new MetaImageCommitmentDefinition(),
    new MetaLinkCommitmentDefinition(),
    new NoteCommitmentDefinition(),

    // Not yet implemented commitments (using placeholder)
    new NotYetImplementedCommitmentDefinition('EXPECT'),
    new NotYetImplementedCommitmentDefinition('SCENARIO'),
    new NotYetImplementedCommitmentDefinition('SCENARIOS'),
    new NotYetImplementedCommitmentDefinition('BEHAVIOUR'),
    new NotYetImplementedCommitmentDefinition('BEHAVIOURS'),
    new NotYetImplementedCommitmentDefinition('AVOID'),
    new NotYetImplementedCommitmentDefinition('AVOIDANCE'),
    new NotYetImplementedCommitmentDefinition('GOAL'),
    new NotYetImplementedCommitmentDefinition('GOALS'),
    new NotYetImplementedCommitmentDefinition('CONTEXT'),
];

/**
 * Gets a commitment definition by its type
 * @param type The commitment type to look up
 * @returns The commitment definition or undefined if not found
 *
 * @private TODO: Maybe should be public?
 */
export function getCommitmentDefinition(type: BookCommitment): CommitmentDefinition | undefined {
    return COMMITMENT_REGISTRY.find((def) => def.type === type);
}

/**
 * Gets all available commitment definitions
 * @returns Array of all commitment definitions
 *
 * @private TODO: Maybe should be public?
 */
export function getAllCommitmentDefinitions(): CommitmentDefinition[] {
    return [...COMMITMENT_REGISTRY];
}

/**
 * Gets all available commitment types
 * @returns Array of all commitment types
 *
 * @private TODO: Maybe should be public?
 */
export function getAllCommitmentTypes(): BookCommitment[] {
    return COMMITMENT_REGISTRY.map((def) => def.type);
}

/**
 * Checks if a commitment type is supported
 * @param type The commitment type to check
 * @returns True if the commitment type is supported
 *
 * @private
 */
export function isCommitmentSupported(type: BookCommitment): boolean {
    return COMMITMENT_REGISTRY.some((def) => def.type === type);
}

/**
 * Creates a custom commitment registry with only specified commitments
 * This is useful for customers who want to disable certain commitments
 *
 * @param enabledCommitments Array of commitment types to enable
 * @returns New registry with only the specified commitments
 *
 * @private
 */
export function createCustomCommitmentRegistry(enabledCommitments: BookCommitment[]): CommitmentDefinition[] {
    return COMMITMENT_REGISTRY.filter((def) => enabledCommitments.includes(def.type));
}

/**
 * TODO: !!!! Maybe create through standardized $register
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
