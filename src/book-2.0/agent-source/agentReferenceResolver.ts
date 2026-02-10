import type { BookCommitment } from '../../commitments/_base/BookCommitment';

/**
 * Resolves compact agent references that appear inside FROM, IMPORT, and TEAM commitments.
 *
 * Implementations are expected to rewrite reference tokens such as `{Activation code agent}`
 * or `@Superagent` into concrete agent URLs before the commitment is applied.
 * @public
 */
export type AgentReferenceResolver = {
    /**
     * Normalizes the content of a commitment before it is applied to the model requirements.
     *
     * @param commitmentType - The commitment keyword (e.g. FROM, IMPORT, TEAM)
     * @param content - Original payload of the commitment
     */
    resolveCommitmentContent(commitmentType: BookCommitment, content: string): Promise<string>;
};
