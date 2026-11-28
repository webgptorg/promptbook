import type { BookCommitment } from '../../commitments/_base/BookCommitment';
import type { TeammateProfile } from './TeammateProfileResolver';

/**
 * Resolves compact agent references that appear inside FROM, IMPORT, and TEAM commitments.
 *
 * Implementations are expected to rewrite reference tokens such as `{Activation code agent}`
 * or `@Superagent` into concrete agent URLs before the commitment is applied.
 *
 * @private @@@
 */
export type AgentReferenceResolver = {
    /**
     * Normalizes the content of a commitment before it is applied to the model requirements.
     *
     * @param commitmentType - The commitment keyword (e.g. FROM, IMPORT, TEAM)
     * @param content - Original payload of the commitment
     */
    resolveCommitmentContent(commitmentType: BookCommitment, content: string): Promise<string>;

    /**
     * Optional: returns the actual human-readable name and description for a teammate agent URL.
     *
     * When implemented, this enriches TEAM tool definitions with the agent's real name and
     * persona description instead of technical IDs derived from the URL path.
     *
     * @param url - Canonical teammate URL from the resolved TEAM commitment content.
     * @returns Agent profile or `null` when the URL is not resolvable locally.
     */
    resolveTeammateProfile?: (url: string) => Promise<TeammateProfile | null>;
};
