import { isSameAgentPermanentId } from '../agentIdentifier';

/**
 * Identity of one agent project, shared by every project runtime state store.
 */
export type AgentProjectIdentity = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project inside the agent `projects/` folder.
     */
    readonly projectName: string;
};

/**
 * Creates the case-insensitive lookup key of one agent project.
 *
 * Agent permanent ids and project directory names are compared without letter casing everywhere,
 * so state stores keyed by this function can never hold two entries for the same project.
 *
 * @param identity - Agent and project identification.
 * @returns Lookup key usable in a `Map` or `Set`.
 */
export function createAgentProjectIdentityKey(identity: AgentProjectIdentity): string {
    return `${identity.agentPermanentId.toLowerCase()}/${identity.projectName.toLowerCase()}`;
}

/**
 * Returns whether two identities describe the same agent project.
 *
 * @param firstIdentity - First agent and project identification.
 * @param secondIdentity - Second agent and project identification.
 * @returns `true` when both identities point at the same project of the same agent.
 */
export function isSameAgentProjectIdentity(
    firstIdentity: AgentProjectIdentity,
    secondIdentity: AgentProjectIdentity,
): boolean {
    return (
        isSameAgentPermanentId(firstIdentity.agentPermanentId, secondIdentity.agentPermanentId) &&
        firstIdentity.projectName.toLowerCase() === secondIdentity.projectName.toLowerCase()
    );
}
