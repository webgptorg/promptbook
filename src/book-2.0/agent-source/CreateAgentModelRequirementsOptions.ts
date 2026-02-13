import type { AgentReferenceResolver } from './AgentReferenceResolver';
import type { InlineKnowledgeSourceUploader } from '../../utils/knowledge/inlineKnowledgeSource';

/**
 * Options for `createAgentModelRequirements` and `createAgentModelRequirementsWithCommitments`.
 *
 * @public exported from `@promptbook/core`
 */
export type CreateAgentModelRequirementsOptions = {
    /**
     * Resolver that transforms compact agent references (FROM, IMPORT, TEAM) into concrete URLs.
     */
    readonly agentReferenceResolver?: AgentReferenceResolver;

    /**
     * Optional hook used to upload inline knowledge files before finalizing the requirements.
     */
    readonly inlineKnowledgeSourceUploader?: InlineKnowledgeSourceUploader;
};
